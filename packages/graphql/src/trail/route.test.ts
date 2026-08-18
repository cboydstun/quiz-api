import { describe, expect, it } from "vitest";
import {
  buildRoute,
  trailDateFor,
  TRAIL_LEGS,
  QUESTIONS_PER_LEG,
  TERRAIN,
} from "./route";

const ALL_DOMAINS = Object.keys(TERRAIN);

describe("trailDateFor", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    expect(trailDateFor(new Date("2026-08-17T04:12:00.000Z"))).toBe(
      "2026-08-17",
    );
  });

  // A local-time formatter would roll the trail over at a different instant
  // for every visitor, so two people "on the same day" could get two routes.
  it("does not shift with the host timezone", () => {
    expect(trailDateFor(new Date("2026-08-17T23:59:59.999Z"))).toBe(
      "2026-08-17",
    );
    expect(trailDateFor(new Date("2026-08-18T00:00:00.000Z"))).toBe(
      "2026-08-18",
    );
  });
});

describe("buildRoute", () => {
  it("returns eight legs when the bank has at least eight domains", () => {
    const route = buildRoute("2026-08-17", ALL_DOMAINS);
    expect(route).toHaveLength(TRAIL_LEGS);
  });

  it("never repeats a domain within a run", () => {
    const route = buildRoute("2026-08-17", ALL_DOMAINS);
    const domains = route.map((leg) => leg.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("numbers legs from one", () => {
    const route = buildRoute("2026-08-17", ALL_DOMAINS);
    expect(route.map((leg) => leg.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("is stable: the same date yields the same route", () => {
    expect(buildRoute("2026-08-17", ALL_DOMAINS)).toEqual(
      buildRoute("2026-08-17", ALL_DOMAINS),
    );
  });

  // The DB returns domains in whatever order the query happened to produce.
  // If that leaked into the seed, two servers could serve two different trails
  // for the same day.
  it("is stable regardless of the order domains arrive in", () => {
    const shuffled = [...ALL_DOMAINS].reverse();
    expect(buildRoute("2026-08-17", shuffled)).toEqual(
      buildRoute("2026-08-17", ALL_DOMAINS),
    );
  });

  it("gives adjacent dates different routes", () => {
    const today = buildRoute("2026-08-17", ALL_DOMAINS).map((l) => l.domain);
    const tomorrow = buildRoute("2026-08-18", ALL_DOMAINS).map((l) => l.domain);
    expect(tomorrow).not.toEqual(today);
  });

  it("dresses each known domain in its terrain", () => {
    const route = buildRoute("2026-08-17", ALL_DOMAINS);
    for (const leg of route) {
      expect(leg.terrain).toBe(TERRAIN[leg.domain]?.terrain);
      expect(leg.hazard).toBe(TERRAIN[leg.domain]?.hazard);
    }
  });

  // `questions.domain` has no CHECK constraint and /management lets an editor
  // type anything. An unrecognised domain must still fly, not vanish.
  it("gives an unknown domain a derived terrain and no hazard", () => {
    const route = buildRoute("2026-08-17", ["Sensor payloads"]);
    expect(route).toHaveLength(1);
    expect(route[0]?.domain).toBe("Sensor payloads");
    expect(route[0]?.terrain).toBe("SENSOR PAYLOADS");
    expect(route[0]?.hazard).toBe(false);
  });

  it("flies a short trail rather than failing when the bank is thin", () => {
    const route = buildRoute("2026-08-17", ["Regulations", "Maintenance"]);
    expect(route).toHaveLength(2);
    expect(route.map((leg) => leg.index)).toEqual([1, 2]);
  });

  it("returns no legs when nothing is classified", () => {
    expect(buildRoute("2026-08-17", [])).toEqual([]);
  });

  it("draws three questions a leg", () => {
    expect(QUESTIONS_PER_LEG).toBe(3);
  });

  // Not a distribution test — just a guard against a seed so weak that a
  // fortnight of trails opens on the same leg.
  it("varies the opening leg across a fortnight", () => {
    const openings = new Set(
      Array.from(
        { length: 14 },
        (_, i) =>
          buildRoute(`2026-08-${String(i + 1).padStart(2, "0")}`, ALL_DOMAINS)[0]
            ?.domain,
      ),
    );
    expect(openings.size).toBeGreaterThan(3);
  });
});
