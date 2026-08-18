/**
 * The daily trail's route.
 *
 * Everything here is pure and takes the date as an argument: the same date must
 * yield the same route on every server, in every process, for every visitor,
 * because the whole point of a daily trail is that people flew the same one.
 * Nothing in this module reads the clock, the database, or the environment.
 */

/** Legs in a full trail. Eight distinct domains, so no question can repeat. */
export const TRAIL_LEGS = 8;

/** Questions drawn per leg. The thinnest domain holds ten, so three is safe. */
export const QUESTIONS_PER_LEG = 3;

export interface TrailLegPlan {
  /** 1-based, as displayed: "LEG 3 OF 8". */
  index: number;
  domain: string;
  /** The domain dressed as terrain. */
  terrain: string;
  /** Hazard legs damage the airframe on a miss; ordinary legs only cost battery. */
  hazard: boolean;
}

/**
 * The twelve Part 107 knowledge areas as terrain.
 *
 * Keys must match `scripts/seed-questions.ts`'s `PART_107_DOMAINS` exactly —
 * they are the values actually stored in `questions.domain`. A domain missing
 * from this map still flies (see `dressDomain`); it just gets no costume.
 */
export const TERRAIN: Record<string, { terrain: string; hazard: boolean }> = {
  Regulations: { terrain: "CHECKPOINT", hazard: false },
  "Airspace classification": { terrain: "THE SHELF", hazard: false },
  "Weather sources": { terrain: "ICING LAYER", hazard: true },
  "Loading and performance": { terrain: "THE CLIMB", hazard: true },
  "Emergency procedures": { terrain: "MAYDAY", hazard: true },
  "Crew resource management": { terrain: "THE HANDOFF", hazard: false },
  "Radio procedures": { terrain: "COMMS SECTOR", hazard: false },
  "Physiological effects": { terrain: "LONG HAUL", hazard: false },
  "Decision-making": { terrain: "THE FORK", hazard: false },
  "Airport operations": { terrain: "THE FIELD", hazard: false },
  Maintenance: { terrain: "FIELD REPAIR", hazard: true },
  "Night operations": { terrain: "LAST LIGHT", hazard: false },
};

/**
 * The trail rolls over at midnight UTC rather than in the visitor's timezone.
 * A local rollover would mean two people can be "on the same day" and be
 * served two different routes, which breaks the only thing a daily trail is
 * for.
 */
export function trailDateFor(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** cyrb53 — a short, well-mixed string hash. Only the low 32 bits are used. */
function hashSeed(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (h2 >>> 0) ^ (h1 >>> 0);
}

/** mulberry32. Deterministic, tiny, and good enough to shuffle twelve items. */
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

/**
 * A deterministic stream for one day.
 *
 * The salt is what keeps two decisions made on the same date from moving in
 * lockstep — if the route and the mission drew from one stream, a given route
 * would always come with the same job.
 */
export function seededRandom(dateISO: string, salt: string): () => number {
  return prng(hashSeed(`${salt}:${dateISO}`));
}

function dressDomain(domain: string): { terrain: string; hazard: boolean } {
  // An editor can type any domain into /management — the column has no CHECK
  // constraint. An unrecognised one flies as plain terrain rather than being
  // dropped, which would silently hide its questions from the trail.
  return TERRAIN[domain] ?? { terrain: domain.toUpperCase(), hazard: false };
}

/**
 * Picks the day's legs.
 *
 * `available` is whatever domains the bank actually has questions in; it is
 * sorted before the draw so the order rows happen to come back from Postgres
 * cannot change the route. Fewer than {@link TRAIL_LEGS} domains yields a
 * shorter trail rather than an error — a thin bank should still fly.
 */
export function buildRoute(
  dateISO: string,
  available: readonly string[],
): TrailLegPlan[] {
  const pool = [...new Set(available)].sort();
  if (pool.length === 0) return [];

  const random = seededRandom(dateISO, "route");

  // Fisher-Yates, drawing from the end so the whole pool stays reachable.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  return pool.slice(0, TRAIL_LEGS).map((domain, i) => ({
    index: i + 1,
    domain,
    ...dressDomain(domain),
  }));
}
