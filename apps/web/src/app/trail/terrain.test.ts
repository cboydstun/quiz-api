import { describe, expect, it } from "vitest";
import { buildSilhouette, PROFILE_HEIGHT, PROFILE_WIDTH } from "./terrain";

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
