import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  currentLeg,
  routePosition,
  startRun,
  TRAIL_RULES,
  type EngineLeg,
  type TrailState,
} from "./engine";

function route(hazards: boolean[], perLeg = 3): EngineLeg[] {
  return hazards.map((hazard) => ({
    hazard,
    questions: Array.from({ length: perLeg }, () => ({})),
  }));
}

const EIGHT_CLEAN = route([
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
]);

/** Flies the whole route, answering `misses` of the questions wrong up front. */
function fly(legs: EngineLeg[], verdicts: boolean[]): TrailState {
  let state = startRun(legs);
  for (const isCorrect of verdicts) {
    if (state.status !== "FLYING") break;
    state = answerQuestion(state, legs, isCorrect);
  }
  return state;
}

const allCorrect = (n: number) => Array.from({ length: n }, () => true);

describe("startRun", () => {
  it("opens on the first leg with the transit for it already spent", () => {
    const state = startRun(EIGHT_CLEAN);

    expect(state.status).toBe("FLYING");
    expect(state.legIndex).toBe(0);
    expect(state.questionIndex).toBe(0);
    expect(state.battery).toBe(
      TRAIL_RULES.START_BATTERY - TRAIL_RULES.TRANSIT_COST,
    );
    expect(state.airframe).toBe(TRAIL_RULES.START_AIRFRAME);
  });

  it("goes down immediately on an empty route rather than flying nowhere", () => {
    expect(startRun([]).status).toBe("DOWN");
  });
});

describe("answerQuestion", () => {
  it("advances within a leg without paying transit again", () => {
    const opened = startRun(EIGHT_CLEAN);
    const state = answerQuestion(opened, EIGHT_CLEAN, true);

    expect(state.legIndex).toBe(0);
    expect(state.questionIndex).toBe(1);
    expect(state.battery).toBe(opened.battery);
  });

  it("charges transit on crossing into the next leg", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(3));

    expect(state.legIndex).toBe(1);
    expect(state.questionIndex).toBe(0);
    expect(state.battery).toBe(
      TRAIL_RULES.START_BATTERY - TRAIL_RULES.TRANSIT_COST * 2,
    );
  });

  it("burns battery on a miss", () => {
    const opened = startRun(EIGHT_CLEAN);
    const state = answerQuestion(opened, EIGHT_CLEAN, false);

    expect(state.battery).toBe(opened.battery - TRAIL_RULES.MISS_COST);
    expect(state.airframe).toBe(TRAIL_RULES.START_AIRFRAME);
  });

  it("leaves the airframe alone on an ordinary leg", () => {
    const state = fly(EIGHT_CLEAN, [false, false, false]);
    expect(state.airframe).toBe(TRAIL_RULES.START_AIRFRAME);
  });

  it("damages the airframe on a miss over a hazard leg", () => {
    const hazardFirst = route([true, false, false]);
    const state = fly(hazardFirst, [false]);

    expect(state.airframe).toBe(
      TRAIL_RULES.START_AIRFRAME - TRAIL_RULES.HAZARD_DAMAGE,
    );
    expect(state.battery).toBe(
      TRAIL_RULES.START_BATTERY -
        TRAIL_RULES.TRANSIT_COST -
        TRAIL_RULES.MISS_COST,
    );
  });

  it("counts every question asked, right or wrong", () => {
    const state = fly(EIGHT_CLEAN, [true, false, true]);

    expect(state.answered).toBe(3);
    expect(state.correct).toBe(2);
  });

  it("arrives after the last question of the last leg", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(24));

    expect(state.status).toBe("ARRIVED");
    expect(state.legIndex).toBe(7);
    expect(state.correct).toBe(24);
  });

  it("ignores answers once the run is over", () => {
    const arrived = fly(EIGHT_CLEAN, allCorrect(24));
    expect(answerQuestion(arrived, EIGHT_CLEAN, true)).toBe(arrived);
  });
});

describe("going down", () => {
  it("ends the run where it ended, without advancing past it", () => {
    const legs = route([false, false, false]);
    let state = fly(legs, allCorrect(3));
    expect(state.legIndex).toBe(1);

    // Less charge left than a miss costs, so the clamp is exercised too.
    state = answerQuestion({ ...state, battery: 3 }, legs, false);

    expect(state.status).toBe("DOWN");
    expect(state.battery).toBe(0);
    expect(state.legIndex).toBe(1);
    expect(state.questionIndex).toBe(0);
  });

  it("ends the run when the airframe fails, with battery to spare", () => {
    const allHazard = route([true, true, true, true]);
    const state = fly(allHazard, [false, false, false, false]);

    expect(state.status).toBe("DOWN");
    expect(state.airframe).toBe(0);
    expect(state.battery).toBeGreaterThan(0);
  });

  it("can run out of charge crossing into a leg", () => {
    // Battery is spent to exactly one transit's worth, then the crossing takes
    // the rest. Going down on the transit rather than on a question is the
    // point of charging for it.
    const shortRoute = route([false, false], 1);
    let state = startRun(shortRoute);
    state = { ...state, battery: TRAIL_RULES.TRANSIT_COST };
    state = answerQuestion(state, shortRoute, true);

    expect(state.status).toBe("DOWN");
    expect(state.battery).toBe(0);
  });

  it("never reports a negative resource", () => {
    const allHazard = route([true, true]);
    const state = fly(allHazard, [false, false, false, false, false, false]);

    expect(state.battery).toBeGreaterThanOrEqual(0);
    expect(state.airframe).toBeGreaterThanOrEqual(0);
  });
});

describe("balance", () => {
  // The survival line the design is tuned to. If a rule constant moves, this
  // is the test that says what it cost.
  it("lets a clean run arrive with better than half a battery", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(24));
    expect(state.battery).toBeGreaterThan(50);
  });

  it("survives six misses over an ordinary route but not seven", () => {
    const six = fly(EIGHT_CLEAN, [
      false,
      false,
      false,
      false,
      false,
      false,
      ...allCorrect(18),
    ]);
    expect(six.status).toBe("ARRIVED");

    const seven = fly(EIGHT_CLEAN, [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      ...allCorrect(17),
    ]);
    expect(seven.status).toBe("DOWN");
  });
});

describe("currentLeg", () => {
  it("returns the leg being flown", () => {
    const legs = route([false, true, false]);
    const state = fly(legs, allCorrect(3));

    expect(currentLeg(state, legs)).toBe(legs[1]);
  });

  it("returns undefined past the end of the route", () => {
    const legs = route([false]);
    const state = fly(legs, allCorrect(3));

    expect(state.status).toBe("ARRIVED");
    expect(currentLeg({ ...state, legIndex: 9 }, legs)).toBeUndefined();
  });
});

describe("routePosition", () => {
  it("starts at the first leg", () => {
    expect(routePosition(startRun(EIGHT_CLEAN), EIGHT_CLEAN)).toBe(0);
  });

  // The whole point: the aircraft moves on every answer, not once a leg.
  it("advances a fraction of a gap per question inside a leg", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(1));

    expect(routePosition(state, EIGHT_CLEAN)).toBeCloseTo(1 / 3);
  });

  it("lands exactly on the node at a leg boundary", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(3));

    expect(state.legIndex).toBe(1);
    expect(routePosition(state, EIGHT_CLEAN)).toBe(1);
  });

  // ARRIVED holds legIndex on the last leg with questionIndex on the last
  // question, which is 7.67 of 7 — off the end of the rail.
  it("clamps an arrived run to the end of the route", () => {
    const state = fly(EIGHT_CLEAN, allCorrect(24));

    expect(state.status).toBe("ARRIVED");
    expect(routePosition(state, EIGHT_CLEAN)).toBe(EIGHT_CLEAN.length - 1);
  });

  it("carries the leg and the fraction together past the first leg", () => {
    const legs = route([false, true, false]);
    const state = fly(legs, [true, true, true, false]);

    expect(state.legIndex).toBe(1);
    expect(state.questionIndex).toBe(1);
    expect(routePosition(state, legs)).toBeCloseTo(1 + 1 / 3);
  });

  it("is zero for an empty route", () => {
    expect(routePosition(startRun([]), [])).toBe(0);
  });
});
