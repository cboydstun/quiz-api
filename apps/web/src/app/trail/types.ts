/**
 * The shapes the trail screens pass around.
 *
 * These mirror the GraphQL contract field-for-field and are hand-written, as
 * everything client-side here is — there is no client codegen. When the SDL in
 * `packages/graphql/src/typeDefs.ts` changes, this changes in the same commit.
 */

export interface TrailQuestion {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  hint: string | null;
  points: number;
}

export interface TrailLeg {
  index: number;
  domain: string;
  terrain: string;
  hazard: boolean;
  /** The crossing beat, one entry per line of transmission. */
  dispatch: string[];
  questions: TrailQuestion[];
}

export interface DailyTrail {
  date: string;
  mission: string[];
  legs: TrailLeg[];
}

/** An operator's outcome on one day, as stored and as reported. */
export interface TrailRunRecord {
  trailDate: string;
  legsReached: number;
  completed: boolean;
  batteryLeft: number;
  airframeLeft: number;
  correct: number;
  total: number;
}

/** One line of the debrief: what was asked, what happened, and why. */
export interface DebriefEntry {
  terrain: string;
  questionText: string;
  chosen: string | null;
  isCorrect: boolean;
  /** True when the miss happened over a hazard leg and cost airframe too. */
  hazardStruck?: boolean;
  correctAnswer: string | null;
  explanation: string | null;
}
