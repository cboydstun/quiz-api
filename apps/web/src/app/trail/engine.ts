/**
 * The trail's rules, as pure functions.
 *
 * Deliberately separate from the page: a permadeath run has more state than a
 * study run, and the balance — how many misses a route survives — is the part
 * most likely to need tuning. Kept here it can be tuned against a test suite
 * instead of against a browser, with no React, no network, and no clock.
 *
 * Nothing here talks to the server. Grading is `submitAnswer`/`gradeAnswers`;
 * this only decides what a verdict costs.
 */

/**
 * Every tunable number in the run, in one place.
 *
 * As set: eight legs of three questions cost 48 battery in transit, so a clean
 * run arrives with 52. Six misses is survivable, a seventh is not — roughly a
 * 75% accuracy floor, which is a shade above the Part 107 pass mark of 70%.
 * `engine.test.ts` pins that survival line; if these move, it will say so.
 */
export const TRAIL_RULES = {
  START_BATTERY: 100,
  START_AIRFRAME: 100,
  /** Charged on entering each leg, including the first. */
  TRANSIT_COST: 6,
  /** Battery burned by a wrong answer anywhere. */
  MISS_COST: 8,
  /** Airframe lost to a wrong answer over a hazard leg only. */
  HAZARD_DAMAGE: 25,
  /** Daylight per question. Between /quiz's MEDIUM (60s) and HARD (30s). */
  SECONDS_PER_QUESTION: 45,
} as const;

export type TrailStatus = "FLYING" | "DOWN" | "ARRIVED";

/**
 * The only part of a leg the rules care about. The page's `TrailLeg` — with
 * its terrain, domain, and question bodies — satisfies this structurally.
 */
export interface EngineLeg {
  hazard: boolean;
  questions: unknown[];
}

export interface TrailState {
  /** 0-based index into the route. Held at the final leg once the run ends. */
  legIndex: number;
  /** 0-based index within the current leg. */
  questionIndex: number;
  battery: number;
  airframe: number;
  status: TrailStatus;
  answered: number;
  correct: number;
}

function clamp(value: number): number {
  return Math.max(0, value);
}

/**
 * Generic in the leg type so the caller gets its own leg back — the page's
 * `TrailLeg` carries terrain and domain that the rules have no opinion about.
 */
export function currentLeg<T extends EngineLeg>(
  state: TrailState,
  route: readonly T[],
): T | undefined {
  return route[state.legIndex];
}

/**
 * Where the aircraft is on the route, in legs, as a fraction.
 *
 * `legIndex` on its own moves once every three questions, which is a diagram
 * rather than a flight. The question index inside the leg carries the rest, so
 * every committed answer moves the aircraft a third of a gap.
 *
 * Clamped to the last leg because an `ARRIVED` run holds `legIndex` on the
 * final leg with `questionIndex` still on the final question — a position past
 * the end of the rail, and the final verdict screen does render it.
 */
export function routePosition(
  state: TrailState,
  route: readonly EngineLeg[],
): number {
  const leg = route[state.legIndex];
  const within =
    leg && leg.questions.length > 0
      ? state.questionIndex / leg.questions.length
      : 0;

  return Math.min(
    Math.max(state.legIndex + within, 0),
    Math.max(route.length - 1, 0),
  );
}

export function startRun(route: readonly EngineLeg[]): TrailState {
  const battery = clamp(TRAIL_RULES.START_BATTERY - TRAIL_RULES.TRANSIT_COST);

  return {
    legIndex: 0,
    questionIndex: 0,
    battery,
    airframe: TRAIL_RULES.START_AIRFRAME,
    // A route with no legs is a bank with nothing classified. Down rather than
    // flying nowhere, so the page has one ending to render instead of two.
    status: route.length === 0 || battery === 0 ? "DOWN" : "FLYING",
    answered: 0,
    correct: 0,
  };
}

/**
 * Applies one verdict and moves the run.
 *
 * Order matters: damage lands first, then the run ends if either resource is
 * gone, and only then does it advance. A run that goes down stays on the leg
 * it went down on — "you made it as far as the Cascade pass" is the score.
 */
export function answerQuestion(
  state: TrailState,
  route: readonly EngineLeg[],
  isCorrect: boolean,
): TrailState {
  if (state.status !== "FLYING") return state;

  const leg = currentLeg(state, route);
  if (!leg) return { ...state, status: "DOWN" };

  const next: TrailState = {
    ...state,
    answered: state.answered + 1,
    correct: state.correct + (isCorrect ? 1 : 0),
  };

  if (!isCorrect) {
    next.battery = clamp(next.battery - TRAIL_RULES.MISS_COST);
    if (leg.hazard) {
      next.airframe = clamp(next.airframe - TRAIL_RULES.HAZARD_DAMAGE);
    }
  }

  if (next.battery === 0 || next.airframe === 0) {
    return { ...next, status: "DOWN" };
  }

  if (next.questionIndex + 1 < leg.questions.length) {
    return { ...next, questionIndex: next.questionIndex + 1 };
  }

  // End of the leg. Arriving is checked before the crossing is charged: there
  // is no transit past the last leg.
  if (next.legIndex + 1 >= route.length) {
    return { ...next, status: "ARRIVED" };
  }

  const battery = clamp(next.battery - TRAIL_RULES.TRANSIT_COST);

  return {
    ...next,
    legIndex: next.legIndex + 1,
    questionIndex: 0,
    battery,
    // Going down on the crossing rather than on a question is exactly what
    // charging for transit is for.
    status: battery === 0 ? "DOWN" : "FLYING",
  };
}
