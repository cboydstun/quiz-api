import { describe, expect, it } from "vitest";
import { buildBand, buildSilhouette, PROFILE_HEIGHT, PROFILE_WIDTH } from "./terrain";

const numbersIn = (d: string) =>
  (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

/** How far the ground wanders, as a stand-in for "rough". */
const roughness = (d: string) => {
  const ys = numbersIn(d).filter((_, i) => i % 2 === 1);
  return ys.reduce(
    (sum, y, i) => (i === 0 ? 0 : sum + Math.abs(y - ys[i - 1]!)),
    0,
  );
};

describe("buildSilhouette", () => {
  it("is stable: the same terrain always looks the same", () => {
    expect(buildSilhouette("ICING LAYER")).toEqual(buildSilhouette("ICING LAYER"));
  });

  it("gives different terrain different ground", () => {
    expect(buildSilhouette("ICING LAYER").ground).not.toBe(
      buildSilhouette("THE SHELF").ground,
    );
  });

  it("emits a path with no NaN in it", () => {
    for (const terrain of ["THE CLIMB", "MAYDAY", "SENSOR PAYLOADS", ""]) {
      const { ground } = buildSilhouette(terrain);
      expect(ground, terrain).not.toMatch(/NaN|undefined/);
      expect(numbersIn(ground).every(Number.isFinite), terrain).toBe(true);
    }
  });

  it("stays inside the viewbox so nothing clips", () => {
    const values = numbersIn(buildSilhouette("THE CLIMB").ground);
    const xs = values.filter((_, i) => i % 2 === 0);
    const ys = values.filter((_, i) => i % 2 === 1);

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(PROFILE_WIDTH);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(PROFILE_HEIGHT);
  });

  // The bias is what makes a generated silhouette read as authored.
  it("climbs on THE CLIMB and stays low on LAST LIGHT", () => {
    const ends = (terrain: string) => {
      const v = numbersIn(buildSilhouette(terrain).ground);
      const ys = v.filter((_, i) => i % 2 === 1);
      return { first: ys[0]!, last: ys.at(-1)! };
    };

    // SVG y grows downward, so a climb ends at a smaller y than it started.
    const climb = ends("THE CLIMB");
    expect(climb.last).toBeLessThan(climb.first);

    const night = ends("LAST LIGHT");
    expect(Math.abs(night.last - night.first)).toBeLessThan(
      Math.abs(climb.last - climb.first),
    );
  });

  it("makes a hazard leg rougher than a calm one", () => {
    expect(roughness(buildSilhouette("MAYDAY").ground)).toBeGreaterThan(
      roughness(buildSilhouette("LAST LIGHT").ground),
    );
  });

  // route.ts flies an unrecognised domain rather than dropping it; the picture
  // has to survive the same thing.
  it("still draws terrain nobody wrote a bias for", () => {
    const { ground } = buildSilhouette("SENSOR PAYLOADS");
    expect(ground.startsWith("M")).toBe(true);
    expect(numbersIn(ground).length).toBeGreaterThan(8);
  });

  it("returns a closed fill path as well as the ground line", () => {
    const { ground, fill } = buildSilhouette("THE SHELF");
    expect(fill.startsWith(ground)).toBe(true);
    expect(fill.trimEnd().endsWith("Z")).toBe(true);
  });
});

describe("buildBand", () => {
  const ysOf = (d: string) => numbersIn(d).filter((_, i) => i % 2 === 1);
  const xsOf = (d: string) => numbersIn(d).filter((_, i) => i % 2 === 0);

  it("is stable: the same route always looks the same", () => {
    const route = ["CHECKPOINT", "THE CLIMB", "MAYDAY"];
    expect(buildBand(route)).toEqual(buildBand(route));
  });

  it("spans one profile width per leg", () => {
    const band = buildBand(["CHECKPOINT", "THE CLIMB", "MAYDAY"]);
    expect(band.width).toBe(3 * PROFILE_WIDTH);
    expect(Math.max(...xsOf(band.ground))).toBe(3 * PROFILE_WIDTH);
    expect(Math.min(...xsOf(band.ground))).toBe(0);
  });

  it("meets itself at every leg seam", () => {
    // THE CLIMB exits high (0.82) and THE FIELD enters low (0.20): stitched
    // naively that is a cliff. The band must hand each leg the height the
    // previous one actually ended on.
    const band = buildBand(["THE CLIMB", "THE FIELD", "MAYDAY"]);
    const ys = ysOf(band.ground);
    const xs = xsOf(band.ground);

    for (let i = 1; i < xs.length; i += 1) {
      // No vertical jump anywhere, seams included: consecutive points never
      // differ by more than the whole usable height would allow a step to.
      expect(Math.abs(ys[i]! - ys[i - 1]!)).toBeLessThan(PROFILE_HEIGHT / 3);
      // And x never goes backwards, so the seam is not a doubled point.
      expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    }
  });

  it("stays inside the band box vertically", () => {
    const band = buildBand(["THE CLIMB", "MAYDAY", "THE SHELF", "LAST LIGHT"]);
    const ys = ysOf(band.ground);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(PROFILE_HEIGHT);
  });

  it("gives the same terrain different ground on different legs", () => {
    // Seeded by terrain AND leg index: a route that repeats a terrain must
    // not repeat its silhouette tile.
    const band = buildBand(["THE FIELD", "THE FIELD"]);
    const ys = ysOf(band.ground);
    const half = Math.floor(ys.length / 2);
    expect(ys.slice(0, half)).not.toEqual(ys.slice(half, half * 2));
  });

  it("returns a closed fill and survives an empty route", () => {
    const band = buildBand(["CHECKPOINT"]);
    expect(band.fill.startsWith(band.ground)).toBe(true);
    expect(band.fill.trimEnd().endsWith("Z")).toBe(true);

    const empty = buildBand([]);
    expect(empty.width).toBeGreaterThan(0);
    expect(empty.ground).not.toMatch(/NaN/);
  });
});
