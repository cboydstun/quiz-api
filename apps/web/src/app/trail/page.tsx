"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Alert, Spinner } from "@/components/ds";
import { trackEvent } from "@/lib/analytics";
import { messageFrom } from "@/lib/errors";
import type { User } from "@/types";
import {
  answerQuestion,
  currentLeg,
  routePosition,
  startRun,
  TRAIL_RULES,
  type TrailState,
} from "./engine";
import { useFlightClock } from "./useFlightClock";
import { useReducedMotion } from "./useReducedMotion";
import type {
  DailyTrail,
  DebriefEntry,
  TrailRunRecord,
} from "./types";
import { Briefing } from "./screens/Briefing";
import { Debrief } from "./screens/Debrief";
import { Spent } from "./screens/Spent";
import { TrailShell } from "./TrailShell";

/**
 * Still asked for, but not a gate: a null `me` means the visitor is signed out
 * and their run is graded rather than recorded — the same arrangement /quiz
 * uses.
 */
const GET_CURRENT_USER: TypedDocumentNode<{ me: User | null }> = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      role
    }
  }
`;

const DAILY_TRAIL: TypedDocumentNode<DailyTrailResult> = gql`
  query DailyTrail {
    dailyTrail {
      date
      mission
      legs {
        index
        domain
        terrain
        hazard
        dispatch
        questions {
          id
          prompt
          questionText
          answers
          hint
          points
        }
      }
    }
  }
`;

const MY_TRAIL_RUN: TypedDocumentNode<MyTrailRunResult> = gql`
  query MyTrailRun {
    myTrailRun {
      trailDate
      legsReached
      completed
      batteryLeft
      airframeLeft
      correct
      total
    }
  }
`;

const RECORD_TRAIL_RUN: TypedDocumentNode<
  { recordTrailRun: TrailRunRecord },
  { input: TrailRunRecord }
> = gql`
  mutation RecordTrailRun($input: RecordTrailRunInput!) {
    recordTrailRun(input: $input) {
      trailDate
      legsReached
      completed
      batteryLeft
      airframeLeft
      correct
      total
    }
  }
`;

const SUBMIT_ANSWER: TypedDocumentNode<SubmitAnswerResult, SubmitAnswerVars> =
  gql`
    mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
      submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
        success
        isCorrect
        correctAnswer
        explanation
      }
    }
  `;

/** The signed-out counterpart to SUBMIT_ANSWER: grades, records nothing. */
const GRADE_ANSWERS: TypedDocumentNode<GradeAnswersResult, GradeAnswersVars> =
  gql`
    mutation GradeAnswers($answers: [AnswerInput!]!) {
      gradeAnswers(answers: $answers) {
        questionId
        isCorrect
        correctAnswer
        explanation
      }
    }
  `;

interface DailyTrailResult {
  dailyTrail: DailyTrail | null;
}
interface MyTrailRunResult {
  myTrailRun: TrailRunRecord | null;
}
interface Graded {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}
interface SubmitAnswerResult {
  submitAnswer: (Graded & { success: boolean }) | null;
}
interface SubmitAnswerVars {
  questionId: string;
  selectedAnswer: string;
}
interface GradeAnswersResult {
  gradeAnswers: (Graded & { questionId: string })[] | null;
}
interface GradeAnswersVars {
  answers: { questionId: string; selectedAnswer: string }[];
}

/**
 * A signed-out visitor has no trail_runs row, so their one-attempt-a-day lives
 * here. It is trivially bypassable and that is fine: the point is not to police
 * anonymous visitors, it is to make an account the thing that keeps a run.
 */
const flownKey = (date: string) => `trail:flown:${date}`;

export default function TrailPage() {
  const { loading: userLoading, data: userData } = useQuery(GET_CURRENT_USER);
  const currentUser = userData?.me ?? null;

  const {
    loading: trailLoading,
    error: trailError,
    data: trailData,
  } = useQuery(DAILY_TRAIL);

  const {
    loading: runLoading,
    data: runData,
    refetch: refetchMyRun,
  } = useQuery(MY_TRAIL_RUN, { skip: !currentUser });

  const [submitAnswer] = useMutation(SUBMIT_ANSWER);
  const [gradeAnswers] = useMutation(GRADE_ANSWERS);
  const [recordTrailRun] = useMutation(RECORD_TRAIL_RUN);

  const trail = trailData?.dailyTrail ?? null;
  const legs = useMemo(() => trail?.legs ?? [], [trail]);

  const [state, setState] = useState<TrailState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<DebriefEntry | null>(null);
  const [debrief, setDebrief] = useState<DebriefEntry[]>([]);
  const [grading, setGrading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Leg index whose crossing beat is on screen, or null when in the air. */
  const [crossing, setCrossing] = useState<number | null>(null);
  /** The ending beat plays once, before the debrief. */
  const [endingSeen, setEndingSeen] = useState(false);

  /**
   * The anonymous half of "one attempt a day". Read in an effect rather than in
   * a useState initialiser: localStorage does not exist during the server
   * render, and the trail date is not known until the query lands.
   */
  const [anonFlown, setAnonFlown] = useState<TrailRunRecord | null>(null);
  useEffect(() => {
    if (!trail || currentUser) return;
    const stored = window.localStorage.getItem(flownKey(trail.date));
    if (!stored) return;

    try {
      setAnonFlown(JSON.parse(stored) as TrailRunRecord);
    } catch {
      // Anything can write to localStorage. A corrupt value must not take the
      // page down — drop it and let them fly.
      window.localStorage.removeItem(flownKey(trail.date));
    }
  }, [trail, currentUser]);

  const leg = state ? currentLeg(state, legs) : undefined;
  const question = leg?.questions[state?.questionIndex ?? 0];
  const flying = state?.status === "FLYING";

  /**
   * Anything on screen that is not a question. Daylight must not burn while
   * the operator is reading a verdict or a dispatch — the clock is a
   * difficulty knob, not a reading-speed test. `grading` joined the set with
   * the redesign: the clock is visible motion now, and burning it against
   * network latency would fly the aircraft somewhere the grade has not
   * sanctioned yet.
   */
  const paused = verdict !== null || crossing !== null || grading;

  const reducedMotion = useReducedMotion();

  /**
   * Expiry calls `commit`, which does not exist yet at this point in the
   * function — the indirection ref breaks the cycle, and is reassigned below
   * once `commit` is in scope.
   */
  const expireRef = useRef<() => void>(() => {});
  const clock = useFlightClock({
    seconds: TRAIL_RULES.SECONDS_PER_QUESTION,
    running: Boolean(flying) && !paused,
    reducedMotion,
    onExpire: () => expireRef.current(),
  });

  const outcomeFor = useCallback(
    (finished: TrailState, date: string): TrailRunRecord => ({
      trailDate: date,
      legsReached: finished.legIndex + 1,
      completed: finished.status === "ARRIVED",
      batteryLeft: finished.battery,
      airframeLeft: finished.airframe,
      correct: finished.correct,
      total: finished.answered,
    }),
    [],
  );

  const finish = useCallback(
    async (finished: TrailState) => {
      if (!trail) return;
      const outcome = outcomeFor(finished, trail.date);

      trackEvent("trail_end", {
        signed_in: Boolean(currentUser),
        legs_reached: outcome.legsReached,
        completed: outcome.completed,
        correct: outcome.correct,
      });

      if (!currentUser) {
        window.localStorage.setItem(
          flownKey(trail.date),
          JSON.stringify(outcome),
        );
        trackEvent("quiz_signup_prompt");
        return;
      }

      try {
        const result = await recordTrailRun({ variables: { input: outcome } });
        // errorPolicy is "all": a rejected mutation resolves with data null
        // rather than throwing, so the error has to be read off the result.
        if (!result.data?.recordTrailRun && result.error) throw result.error;
        await refetchMyRun();
      } catch (err) {
        console.error("Error recording trail run:", err);
        // The run itself still stands — every answer was already recorded by
        // submitAnswer. Only the day's outcome row failed.
        setNotice(
          messageFrom(err, "The run finished but could not be filed."),
        );
      }
    },
    [trail, currentUser, outcomeFor, recordTrailRun, refetchMyRun],
  );

  /**
   * Grades one answer and applies what it cost.
   *
   * One round trip per question rather than /quiz's batch at the end, because
   * the damage has to land before the next question is drawn — a run whose
   * battery only moves at the finish is not a run.
   */
  const commit = useCallback(
    async (answer: string | null) => {
      if (!state || !question || grading) return;
      setGrading(true);
      setNotice(null);
      // The grade is in flight: the clock stops, the aircraft holds.
      clock.freeze();

      try {
        let graded: Graded | null = null;

        if (answer !== null) {
          if (currentUser) {
            const result = await submitAnswer({
              variables: { questionId: question.id, selectedAnswer: answer },
            });
            if (!result.data?.submitAnswer) throw result.error;
            graded = result.data.submitAnswer;
          } else {
            const result = await gradeAnswers({
              variables: {
                answers: [{ questionId: question.id, selectedAnswer: answer }],
              },
            });
            const [first] = result.data?.gradeAnswers ?? [];
            if (!first) throw result.error;
            graded = first;
          }
        }

        // Daylight ran out with nothing selected. Graded as a miss without a
        // round trip: submitting an answer the operator never chose would put
        // a fabricated response in their record.
        const isCorrect = graded?.isCorrect ?? false;
        const entry: DebriefEntry = {
          terrain: leg?.terrain ?? "",
          questionText: question.questionText,
          chosen: answer,
          isCorrect,
          hazardStruck: !isCorrect && Boolean(leg?.hazard),
          correctAnswer: graded?.correctAnswer ?? null,
          explanation: graded?.explanation ?? null,
        };

        const next = answerQuestion(state, legs, isCorrect);
        setState(next);
        setDebrief((prev) => [...prev, entry]);
        setVerdict(entry);
        setSelected(null);
        setShowHint(false);

        // Staged here rather than derived later: this is the only moment that
        // knows a leg boundary was crossed. A run that ends does not cross —
        // answerQuestion holds legIndex where it went down.
        if (next.status === "FLYING" && next.legIndex !== state.legIndex) {
          setCrossing(next.legIndex);
        }

        // The verdict drives, the clock animates: a run that ended goes down
        // where it is, anything else flies the advance the answer bought.
        if (next.status === "DOWN") {
          clock.crash();
        } else {
          clock.burst(routePosition(next, legs));
        }

        if (next.status !== "FLYING") await finish(next);
      } catch (err) {
        console.error("Error grading the answer:", err);
        // The clock resumes exactly where it froze — the answer was never
        // graded, so nothing was spent.
        clock.release();
        setNotice(messageFrom(err, "That answer could not be graded."));
      } finally {
        setGrading(false);
      }
    },
    [
      state,
      question,
      grading,
      currentUser,
      submitAnswer,
      gradeAnswers,
      leg,
      legs,
      finish,
      clock,
    ],
  );

  // Out of daylight: commit whatever is selected, or nothing. The hook fires
  // this once per question; its own latch survives the render churn here.
  useEffect(() => {
    expireRef.current = () => void commit(selected);
  }, [commit, selected]);

  /** Clears the verdict and hands the next question a fresh clock. */
  const resume = () => {
    setVerdict(null);
    clock.resetDaylight();
  };

  const dismissCrossing = () => {
    setCrossing(null);
    clock.resetDaylight();
  };

  const begin = () => {
    setState(startRun(legs));
    setDebrief([]);
    setVerdict(null);
    setSelected(null);
    setNotice(null);
    setEndingSeen(false);
    // Launch puts you on the first crossing, not straight into a question:
    // leg one is a crossing like any other.
    setCrossing(0);
    clock.setPosition(0);
    clock.resetDaylight();
    trackEvent("trail_start", {
      signed_in: Boolean(currentUser),
      legs: legs.length,
    });
  };

  if (userLoading || trailLoading || runLoading)
    return <Spinner label="Plotting today's route" />;

  if (trailError || !trail)
    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <Alert tone="abort">
          Today&apos;s route could not be plotted. Try again shortly.
        </Alert>
      </div>
    );

  if (legs.length === 0)
    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <Alert tone="caution" kicker="NO ROUTE">
          No questions are classified into knowledge areas yet, so there is
          nothing to fly. Take an untimed run instead.
        </Alert>
      </div>
    );

  const alreadyFlown = runData?.myTrailRun ?? anonFlown;

  /*
   * Which screen is showing. The door and the scoreboard are full pages; the
   * run itself is the ground-station shell, which mounts at launch and does
   * not unmount until the ending beat has played — every beat in between
   * swaps a panel inside it, so the instruments and the world stay live.
   */

  if (!state) {
    return alreadyFlown ? (
      <Spent run={alreadyFlown} legCount={legs.length} />
    ) : (
      <Briefing
        trail={trail}
        signedIn={Boolean(currentUser)}
        onLaunch={begin}
      />
    );
  }

  if ((state.status !== "FLYING" && endingSeen) || !leg) {
    return (
      <Debrief
        run={state}
        legs={legs}
        entries={debrief}
        trailDate={trail.date}
        signedIn={Boolean(currentUser)}
      />
    );
  }

  return (
    <TrailShell
      run={state}
      legs={legs}
      trailDate={trail.date}
      operator={currentUser?.username ?? "Guest"}
      daylight={clock.daylight}
      verdict={verdict}
      crossing={crossing}
      notice={notice}
      selected={selected}
      grading={grading}
      showHint={showHint}
      clockRef={clock.ref}
      mode={clock.mode}
      onSelect={setSelected}
      onToggleHint={() => setShowHint(!showHint)}
      onDismissNotice={() => setNotice(null)}
      onCommit={() => void commit(selected)}
      onResume={resume}
      onDismissCrossing={dismissCrossing}
      onEndingSeen={() => setEndingSeen(true)}
    />
  );
}
