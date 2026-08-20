/**
 * The ground a leg is flown over.
 *
 * Silhouettes are generated rather than drawn. Hashing the terrain name into a
 * seeded PRNG — the same trick `packages/graphql/src/trail/route.ts` uses for
 * the route — means ICING LAYER looks the same to every operator and the same
 * tomorrow, without twelve hand-authored paths to keep in sync with the twelve
 * knowledge areas.
 *
 * Pure: no clock, no network, no React. The terrain name is the only input, and
 * the server already deals that deterministically, so none of this needs to
 * cross the wire.
 */

/** The viewBox the paths are drawn in. Unitless; the SVG scales to its box. */
export const PROFILE_WIDTH = 320;
export const PROFILE_HEIGHT = 88;

/** Points along the ground. Enough to read as terrain, few enough to stay cheap. */
const STEPS = 24;

/** Keeps the ground clear of the very top and bottom of the box. */
const MARGIN = 8;

interface Bias {
  /** Ground height at the start and end, 0 (valley floor) to 1 (peak). */
  from: number;
  to: number;
  /** How far the ground wanders between them. */
  rough: number;
}

/**
 * What each terrain is shaped like. This is the part that reads as authored:
 * THE CLIMB climbs, MAYDAY breaks downward and jagged, LAST LIGHT runs flat and
 * low because there is nothing left to see.
 */
const BIAS: Record<string, Bias> = {
  CHECKPOINT: { from: 0.25, to: 0.28, rough: 0.1 },
  "THE SHELF": { from: 0.3, to: 0.62, rough: 0.16 },
  "ICING LAYER": { from: 0.45, to: 0.5, rough: 0.3 },
  "THE CLIMB": { from: 0.18, to: 0.82, rough: 0.22 },
  MAYDAY: { from: 0.7, to: 0.2, rough: 0.42 },
  "THE HANDOFF": { from: 0.35, to: 0.35, rough: 0.14 },
  "COMMS SECTOR": { from: 0.3, to: 0.4, rough: 0.18 },
  "LONG HAUL": { from: 0.32, to: 0.3, rough: 0.08 },
  "THE FORK": { from: 0.35, to: 0.55, rough: 0.34 },
  "THE FIELD": { from: 0.2, to: 0.22, rough: 0.12 },
  "FIELD REPAIR": { from: 0.4, to: 0.38, rough: 0.26 },
  "LAST LIGHT": { from: 0.28, to: 0.26, rough: 0.09 },
};

/** Anything an editor invents still gets ground to fly over. */
const UNCHARTED: Bias = { from: 0.32, to: 0.42, rough: 0.2 };

function hash(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return (h1 >>> 0) ^ (h2 >>> 0);
}

function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

export interface Silhouette {
  /** The ground line, as an SVG `d`. */
  ground: string;
  /** The same line closed down to the baseline, for a fill beneath it. */
  fill: string;
}

/**
 * Builds the ground for one leg.
 *
 * The shape is a straight interpolation from the bias's start height to its end
 * height, with seeded noise laid over it. Noise is damped at both ends so the
 * silhouette meets the edges of the box cleanly rather than jumping at the
 * seam, and clamped so nothing can leave the viewBox — a stray point there
 * would put `NaN` or a clipped peak on screen rather than terrain.
 */
export function buildSilhouette(terrain: string): Silhouette {
  const bias = BIAS[terrain] ?? UNCHARTED;
  const random = prng(hash(terrain));

  const points: [number, number][] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS;
    const x = t * PROFILE_WIDTH;

    // Damped at the ends: sin(pi*t) is 0 at both edges and 1 in the middle.
    const noise = (random() - 0.5) * bias.rough * Math.sin(Math.PI * t);
    const height = bias.from + (bias.to - bias.from) * t + noise;

    const usable = PROFILE_HEIGHT - MARGIN * 2;
    const clamped = Math.max(0, Math.min(1, height));
    // SVG y grows downward, so a taller ground sits at a smaller y.
    const y = MARGIN + (1 - clamped) * usable;

    points.push([round(x), round(y)]);
  }

  const ground = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");

  return {
    ground,
    fill: `${ground} L${PROFILE_WIDTH} ${PROFILE_HEIGHT} L0 ${PROFILE_HEIGHT} Z`,
  };
}

export interface Band {
  /** The stitched ground line across every leg, as an SVG `d`. */
  ground: string;
  /** The same line closed down to the baseline, for a fill beneath it. */
  fill: string;
  /** Total width in viewBox units: one `PROFILE_WIDTH` per leg. */
  width: number;
}

/**
 * Builds the whole route's ground as one scrollable band.
 *
 * Stitching `buildSilhouette` tiles side by side would put a cliff at every
 * seam — THE CLIMB exits at 0.82 and whatever follows enters wherever its own
 * bias says. So each leg here starts from the height the previous leg actually
 * ended on and interpolates toward its own `to`; noise is damped to zero at
 * both edges exactly as in `buildSilhouette`, which is what makes the seam
 * exact rather than merely close.
 *
 * Seeded by terrain name *and* leg index, so a route that repeats a terrain
 * does not repeat its tile — while staying identical for every operator and
 * the same tomorrow, like everything else in this file.
 */
export function buildBand(route: readonly string[]): Band {
  // An empty route still gets ground to draw: one uncharted tile.
  const legs = route.length > 0 ? route : [""];
  const usable = PROFILE_HEIGHT - MARGIN * 2;
  const points: [number, number][] = [];

  let entry: number | null = null;
  legs.forEach((terrain, legIndex) => {
    const bias = BIAS[terrain] ?? UNCHARTED;
    const from = entry ?? Math.max(0, Math.min(1, bias.from));
    const to = Math.max(0, Math.min(1, bias.to));
    const random = prng(hash(`${terrain}#${legIndex}`));

    // The first point of every leg after the first is the previous leg's last
    // point; starting at i=1 keeps the seam a single point, not a doubled one.
    for (let i = legIndex === 0 ? 0 : 1; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const x = legIndex * PROFILE_WIDTH + t * PROFILE_WIDTH;

      const noise = (random() - 0.5) * bias.rough * Math.sin(Math.PI * t);
      const height = from + (to - from) * t + noise;
      const clamped = Math.max(0, Math.min(1, height));
      const y = MARGIN + (1 - clamped) * usable;

      points.push([round(x), round(y)]);
    }

    // Noise is zero at t=1, so the leg genuinely ends on its bias height.
    entry = to;
  });

  const width = legs.length * PROFILE_WIDTH;
  const ground = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");

  return {
    ground,
    fill: `${ground} L${width} ${PROFILE_HEIGHT} L0 ${PROFILE_HEIGHT} Z`,
    width,
  };
}
