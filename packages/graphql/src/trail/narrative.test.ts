import { describe, expect, it } from "vitest";
import { TERRAIN } from "./route";
import { buildNarrative, MISSIONS } from "./narrative";

const ALL_TERRAIN = Object.values(TERRAIN).map((t) => t.terrain);
const A_ROUTE = ALL_TERRAIN.slice(0, 8);

describe("buildNarrative", () => {
  it("gives a dispatch for every leg", () => {
    const narrative = buildNarrative("2026-08-17", A_ROUTE);

    expect(narrative.dispatches).toHaveLength(A_ROUTE.length);
    for (const dispatch of narrative.dispatches) {
      expect(dispatch.length).toBeGreaterThan(0);
      for (const line of dispatch) expect(line.trim()).not.toBe("");
    }
  });

  it("briefs the mission before launch", () => {
    const { mission } = buildNarrative("2026-08-17", A_ROUTE);

    expect(mission.length).toBeGreaterThan(0);
    for (const line of mission) expect(line.trim()).not.toBe("");
  });

  it("is stable: the same date yields the same story", () => {
    expect(buildNarrative("2026-08-17", A_ROUTE)).toEqual(
      buildNarrative("2026-08-17", A_ROUTE),
    );
  });

  it("gives a different job on a different day", () => {
    const missions = new Set(
      Array.from({ length: 20 }, (_, i) =>
        buildNarrative(
          `2026-09-${String(i + 1).padStart(2, "0")}`,
          A_ROUTE,
        ).mission.join(" "),
      ),
    );

    expect(missions.size).toBeGreaterThan(2);
  });

  /**
   * Route and mission draw on different salts. If they shared a stream, a given
   * route would always arrive with the same job and the pairing would go stale
   * far faster than either pool on its own.
   */
  it("does not lock the mission to the route", () => {
    const sameRouteDifferentDays = new Set(
      Array.from({ length: 12 }, (_, i) =>
        buildNarrative(
          `2026-10-${String(i + 1).padStart(2, "0")}`,
          A_ROUTE,
        ).mission.join(" "),
      ),
    );

    expect(sameRouteDifferentDays.size).toBeGreaterThan(1);
  });

  it("has written a beat for every terrain the route can deal", () => {
    // One leg at a time, so a terrain with no beats cannot hide behind its
    // neighbours.
    for (const terrain of ALL_TERRAIN) {
      const [dispatch] = buildNarrative("2026-08-17", [terrain]).dispatches;
      expect(dispatch, `no beat written for ${terrain}`).toBeDefined();
      expect(dispatch!.length).toBeGreaterThan(0);
    }
  });

  // questions.domain has no CHECK constraint, so an editor can invent a domain,
  // and route.ts dresses it as plain terrain rather than dropping it. The
  // narrative has to survive the same thing.
  it("falls back rather than returning nothing for unknown terrain", () => {
    const { dispatches } = buildNarrative("2026-08-17", ["SENSOR PAYLOADS"]);

    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]!.length).toBeGreaterThan(0);
  });

  it("handles a route with no legs", () => {
    const narrative = buildNarrative("2026-08-17", []);

    expect(narrative.dispatches).toEqual([]);
    expect(narrative.mission.length).toBeGreaterThan(0);
  });

  it("varies the beat for a terrain across days", () => {
    const beats = new Set(
      Array.from({ length: 20 }, (_, i) =>
        buildNarrative(`2026-11-${String(i + 1).padStart(2, "0")}`, [
          "ICING LAYER",
        ]).dispatches[0]!.join(" "),
      ),
    );

    expect(beats.size).toBeGreaterThan(1);
  });
});

describe("the written pool", () => {
  it("keeps every line short enough to read as radio traffic", () => {
    const lines = [
      ...MISSIONS.flat(),
      ...ALL_TERRAIN.flatMap(
        (terrain) => buildNarrative("2026-08-17", [terrain]).dispatches[0]!,
      ),
    ];

    // Long enough to say something, short enough not to overflow a phone at
    // the mono size these render in.
    for (const line of lines) {
      expect(line.length, `too long: ${line}`).toBeLessThanOrEqual(62);
    }
  });

  it("offers enough jobs that a week does not repeat", () => {
    expect(MISSIONS.length).toBeGreaterThanOrEqual(7);
  });
});
