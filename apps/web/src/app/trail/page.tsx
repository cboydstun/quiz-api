"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Alert,
  Button,
  buttonClass,
  cn,
  Label,
  Meter,
  Panel,
  QuestionCard,
  Readout,
  Spinner,
  Status,
} from "@/components/ds";
import { Teletype } from "./Teletype";
import { trackEvent } from "@/lib/analytics";
import { messageFrom } from "@/lib/errors";
import type { User } from "@/types";
import {
  answerQuestion,
  currentLeg,
  startRun,
  TRAIL_RULES,
  type TrailState,
} from "./engine";

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

interface TrailQuestion {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  hint: string | null;
  points: number;
}
interface TrailLeg {
  index: number;
  domain: string;
  terrain: string;
  hazard: boolean;
  /** The crossing beat, one entry per line of transmission. */
  dispatch: string[];
  questions: TrailQuestion[];
}
interface DailyTrailResult {
  dailyTrail: { date: string; mission: string[]; legs: TrailLeg[] } | null;
}
interface TrailRunRecord {
  trailDate: string;
  legsReached: number;
  completed: boolean;
  batteryLeft: number;
  airframeLeft: number;
  correct: number;
  total: number;
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

/** One line of the debrief: what was asked, what happened, and why. */
interface DebriefEntry {
  terrain: string;
  questionText: string;
  chosen: string | null;
  isCorrect: boolean;
  correctAnswer: string | null;
  explanation: string | null;
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
  const [daylight, setDaylight] = useState<number>(
    TRAIL_RULES.SECONDS_PER_QUESTION,
  );
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

        if (next.status !== "FLYING") await finish(next);
      } catch (err) {
        console.error("Error grading the answer:", err);
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
    ],
  );

  /**
   * Anything on screen that is not a question. Daylight must not burn while the
   * operator is reading a verdict or a dispatch — the clock is a difficulty
   * knob, not a reading-speed test.
   */
  const paused = verdict !== null || crossing !== null;

  /**
   * Daylight. The clock only ticks — it is reset where the run actually moves
   * (`begin`, `resume`, `dismissCrossing`), not from inside the effect, because
   * resetting it here would be a setState in an effect body and a cascading
   * render for every question.
   */
  useEffect(() => {
    if (!flying || paused) return;

    const timer = setInterval(() => {
      setDaylight((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [flying, paused]);

  /** Clears the verdict and hands the next question a fresh clock. */
  const resume = () => {
    setVerdict(null);
    setDaylight(TRAIL_RULES.SECONDS_PER_QUESTION);
  };

  const dismissCrossing = () => {
    setCrossing(null);
    setDaylight(TRAIL_RULES.SECONDS_PER_QUESTION);
  };

  // Out of daylight: commit whatever is selected, or nothing. The ref latch
  // keeps one zero-crossing from committing twice.
  const expiredRef = useRef(false);
  useEffect(() => {
    if (daylight > 0) {
      expiredRef.current = false;
      return;
    }
    if (!flying || paused || grading || expiredRef.current) return;
    expiredRef.current = true;
    void commit(selected);
  }, [daylight, flying, paused, grading, selected, commit]);

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
    setDaylight(TRAIL_RULES.SECONDS_PER_QUESTION);
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
  const totalQuestions = legs.reduce(
    (sum, item) => sum + item.questions.length,
    0,
  );

  // ── Screens ──────────────────────────────────────────────────────────────

  const renderBriefing = () => (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Label tag="///" className="mb-6">
        Trail {trail.date}
      </Label>
      <h1 className="m-0 mb-4 text-2xl font-medium tracking-tight text-bone-100">
        Today&apos;s trail
      </h1>
      <p className="m-0 mb-8 max-w-[62ch] text-sm leading-normal text-mute-500">
        Every operator flies this same route today. {legs.length} legs,{" "}
        {totalQuestions} questions, one attempt. A wrong answer costs{" "}
        {TRAIL_RULES.MISS_COST}% battery; a wrong answer over a hazard costs{" "}
        {TRAIL_RULES.HAZARD_DAMAGE}% airframe. Run either to zero and the run
        ends where it ended.
      </p>

      {/* The job. Types out, because a briefing that is simply there has
          already been read before the operator decides to read it. */}
      <Panel label="The Job" tag="///" padding="md" className="mb-px">
        <Teletype lines={trail.mission} />
      </Panel>

      <Panel label="Route" meta={`${legs.length} legs`} padding="none">
        <div className="grid gap-px bg-line-hairline sm:grid-cols-2">
          {legs.map((item) => (
            <div key={item.domain} className="bg-ink-800 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="label-mono text-mute-500">
                  Leg {String(item.index).padStart(2, "0")}
                </span>
                {item.hazard && <Status tone="abort">Hazard</Status>}
              </div>
              <div className="mb-1 font-mono text-sm tracking-mono text-bone-100">
                {item.terrain}
              </div>
              <div className="text-sm text-mute-500">{item.domain}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-line-hairline px-5 py-4">
          <Button variant="signal" size="md" onClick={begin}>
            Launch
          </Button>
        </div>
      </Panel>

      {!currentUser && (
        <p className="m-0 mt-6 max-w-[62ch] text-sm leading-normal text-mute-500">
          You can fly without an account. Nothing will be recorded.
        </p>
      )}
    </div>
  );

  const renderSpent = (run: TrailRunRecord) => (
    <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
      <Panel
        label="Trail Flown"
        tag="///"
        meta={run.trailDate}
        padding="none"
      >
        <div className="grid grid-cols-2 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-4">
          <div className="bg-ink-800">
            <Readout
              label="Reached"
              value={`${run.legsReached} / ${legs.length}`}
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Outcome"
              value={run.completed ? "Arrived" : "Down"}
              tone={run.completed ? "go" : "abort"}
            />
          </div>
          <div className="bg-ink-800">
            <Readout label="Correct" value={`${run.correct} / ${run.total}`} />
          </div>
          <div className="bg-ink-800">
            <Readout label="Battery" value={run.batteryLeft} unit="%" />
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="m-0 max-w-[52ch] text-sm leading-normal text-mute-400">
            One trail a day. The next route is plotted at 00:00 UTC.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/quiz"
              className={buttonClass({ variant: "signal", size: "md" })}
            >
              Take an Untimed Run
            </Link>
            <Link
              href="/leaderboard"
              className={buttonClass({ variant: "outline", size: "md" })}
            >
              Standings
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );

  /**
   * The crossing. A hairline draws across, the terrain resolves in, then the
   * dispatch types. Continue is available throughout — the beat is atmosphere,
   * not a gate, and gating it would make the eighth run of the week a chore.
   */
  const renderCrossing = (index: number) => {
    const active = legs[index];
    if (!active) return null;

    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <Label tag="///" className="mb-6">
          Leg {String(active.index).padStart(2, "0")} of{" "}
          {String(legs.length).padStart(2, "0")}
        </Label>

        {/* The route line. Width only — the system forbids anything that
            scales, and a line drawing across is what a crossing looks like. */}
        <div className="mb-8 h-px bg-ink-600">
          <div className="route-draw h-px bg-signal" />
        </div>

        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="signal-in m-0 font-mono text-3xl font-medium tracking-tight text-bone-100">
            {active.terrain}
          </h1>
          {active.hazard && (
            <Status tone="abort" filled>
              Hazard
            </Status>
          )}
        </div>

        <Panel label={active.domain} tag="///" padding="md">
          <Teletype lines={active.dispatch} />
          <div className="mt-6 border-t border-line-hairline pt-5">
            <Button
              variant="signal"
              size="md"
              onClick={dismissCrossing}
              autoFocus
            >
              Fly the leg
            </Button>
          </div>
        </Panel>
      </div>
    );
  };

  /**
   * The last beat before the numbers. This is the only place the fiction gets
   * to land the outcome, so the debrief can stay a scoreboard.
   */
  const renderEnding = (run: TrailState) => {
    const arrived = run.status === "ARRIVED";
    const where = legs[run.legIndex]?.terrain ?? "the leg";

    const lines = arrived
      ? [
          `All ${legs.length} legs flown. Cards are full.`,
          `${run.battery}% charge and the airframe intact.`,
          "The client gets the shots.",
        ]
      : run.airframe === 0
        ? [
            `Telemetry stopped over ${where}.`,
            "The airframe did not survive the crossing.",
            "The client is not getting the shots.",
          ]
        : [
            `Charge ran out over ${where}.`,
            "It came down where it came down.",
            "The client is not getting the shots.",
          ];

    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <Panel
          label={arrived ? "On The Ground" : "Signal Lost"}
          tag="///"
          meta={trail.date}
          padding="md"
        >
          <Status tone={arrived ? "go" : "abort"} filled>
            {arrived ? "Arrived" : "Down"}
          </Status>
          <div className="mt-5">
            <Teletype lines={lines} />
          </div>
          <div className="mt-6 border-t border-line-hairline pt-5">
            <Button
              variant="signal"
              size="md"
              onClick={() => setEndingSeen(true)}
              autoFocus
            >
              Debrief
            </Button>
          </div>
        </Panel>
      </div>
    );
  };

  /**
   * `damaged` tints the row for exactly as long as a miss verdict is on screen.
   * A timed flash would need a timer and a piece of state; tying it to the
   * verdict makes it declarative and gives it the right duration for free.
   */
  const renderInstruments = (run: TrailState, damaged = false) => (
    <div
      className={cn(
        "mb-px grid grid-cols-1 gap-px bg-line-hairline transition-fast sm:grid-cols-3",
        damaged && "bg-abort",
      )}
    >
      <div className="bg-ink-800">
        <Meter label="Battery" value={run.battery} />
      </div>
      <div className="bg-ink-800">
        <Meter label="Airframe" value={run.airframe} />
      </div>
      <div className="bg-ink-800">
        <Meter
          label="Daylight"
          value={(daylight / TRAIL_RULES.SECONDS_PER_QUESTION) * 100}
          readout={`${daylight}s`}
        />
      </div>
    </div>
  );

  const renderVerdict = (run: TrailState, entry: DebriefEntry) => {
    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        {renderInstruments(run, !entry.isCorrect)}
        <Panel
          label={entry.terrain}
          tag="///"
          meta={entry.isCorrect ? "CLEARED" : "STRUCK"}
          padding="md"
        >
          <Status tone={entry.isCorrect ? "go" : "abort"} filled>
            {entry.isCorrect ? "Correct" : "Missed"}
          </Status>

          {!entry.isCorrect && (
            <div className="mt-5 flex flex-col gap-1 border-t border-line-hairline pt-5">
              {entry.chosen ? (
                <div className="text-sm text-mute-500">
                  <span className="label-mono text-abort">Chose</span>{" "}
                  {entry.chosen}
                </div>
              ) : (
                <div className="text-sm text-mute-500">
                  <span className="label-mono text-abort">Daylight</span> Out of
                  daylight — no answer committed.
                </div>
              )}
              {entry.correctAnswer && (
                <div className="text-sm text-bone-100">
                  <span className="label-mono text-go">Answer</span>{" "}
                  {entry.correctAnswer}
                </div>
              )}
              {entry.explanation && (
                <p className="m-0 mt-2 max-w-[68ch] text-sm leading-normal text-mute-400">
                  {entry.explanation}
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            {/*
              Always "Continue" — what comes next is a crossing, or the ending
              beat, never the debrief directly. Naming it for the destination
              would be wrong three times out of four.
            */}
            <Button variant="signal" size="md" onClick={resume} autoFocus>
              Continue
            </Button>
          </div>
        </Panel>
      </div>
    );
  };

  const renderQuestion = (run: TrailState, active: TrailLeg) => {
    const item = active.questions[run.questionIndex];
    if (!item) return null;

    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Label tag="///">
            {currentUser?.username ?? "Guest"} · Leg {active.index} of{" "}
            {legs.length} · {active.terrain}
          </Label>
          {active.hazard && (
            <Status tone="abort" filled>
              Hazard
            </Status>
          )}
        </div>

        {renderInstruments(run)}

        {notice && (
          <div className="mb-6">
            <Alert
              tone="caution"
              kicker="NOTICE"
              onDismiss={() => setNotice(null)}
            >
              {notice}
            </Alert>
          </div>
        )}

        <QuestionCard
          label={active.domain}
          index={run.questionIndex + 1}
          total={active.questions.length}
          points={item.points}
          timeRemaining={daylight}
          prompt={item.prompt}
          questionText={item.questionText}
          answers={item.answers}
          selected={selected ?? undefined}
          onSelect={(answer) => setSelected(answer)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label-mono text-mute-500">
                {active.hazard
                  ? `Miss: −${TRAIL_RULES.MISS_COST}% battery, −${TRAIL_RULES.HAZARD_DAMAGE}% airframe`
                  : `Miss: −${TRAIL_RULES.MISS_COST}% battery`}
              </span>
              <Button
                variant="signal"
                size="sm"
                disabled={!selected || grading}
                onClick={() => void commit(selected)}
              >
                {grading ? "Grading" : "Commit"}
              </Button>
            </div>
          }
        >
          {item.hint && (
            <div>
              <Button
                variant="caution"
                size="sm"
                onClick={() => setShowHint(!showHint)}
              >
                {showHint ? "Hide Hint" : "Show Hint"}
              </Button>
              {showHint && (
                <div className="mt-4">
                  <Alert tone="caution" kicker="HINT">
                    {item.hint}
                  </Alert>
                </div>
              )}
            </div>
          )}
        </QuestionCard>
      </div>
    );
  };

  const renderDebrief = (run: TrailState) => {
    const arrived = run.status === "ARRIVED";

    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        <Panel
          label={arrived ? "Arrived" : "Down"}
          tag="///"
          meta={trail.date}
          padding="none"
        >
          {/*
            The readouts fill in one after another rather than appearing as a
            block — an instrument panel coming up, not a scorecard being
            handed over. The delay is inline because it is index-driven; the
            animation itself is a token, so reduced motion zeroes it.

            The prose summary that used to sit under here is gone: the ending
            beat now says where the run stopped, and hearing it twice in two
            screens made the debrief read like it was padding.
          */}
          <div className="grid grid-cols-2 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-4">
            {[
              {
                label: "Reached",
                value: `${run.legIndex + 1} / ${legs.length}`,
                tone: arrived ? ("go" as const) : ("abort" as const),
              },
              {
                label: "Correct",
                value: `${run.correct} / ${run.answered}`,
              },
              { label: "Battery", value: run.battery, unit: "%" },
              { label: "Airframe", value: run.airframe, unit: "%" },
            ].map((readout, i) => (
              <div
                key={readout.label}
                className="signal-in bg-ink-800"
                style={{ animationDelay: `calc(var(--duration-fast) * ${i})` }}
              >
                <Readout
                  label={readout.label}
                  value={readout.value}
                  unit={readout.unit}
                  tone={readout.tone}
                />
              </div>
            ))}
          </div>

          {/* The review. Only the misses carry a correction — repeating a
              right answer back is noise. */}
          <div className="flex flex-col gap-2 px-5 py-5">
            {debrief.map((entry, i) => (
              <div
                key={`${entry.questionText}-${i}`}
                className={`border border-line-hairline border-l-2 bg-ink-700 px-4 py-3 ${
                  entry.isCorrect ? "border-l-go" : "border-l-abort"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-3xs tracking-mono text-mute-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm text-mute-400">
                    {entry.questionText}
                  </span>
                  <Status tone={entry.isCorrect ? "go" : "abort"}>
                    {entry.isCorrect ? "Correct" : "Missed"}
                  </Status>
                </div>

                {!entry.isCorrect && entry.correctAnswer && (
                  <div className="mt-3 flex flex-col gap-1 border-t border-line-hairline pt-3 pl-9">
                    <div className="text-sm text-bone-100">
                      <span className="label-mono text-go">Answer</span>{" "}
                      {entry.correctAnswer}
                    </div>
                    {entry.explanation && (
                      <p className="m-0 mt-1 max-w-[68ch] text-sm leading-normal text-mute-400">
                        {entry.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/*
            The wall, placed at the end of the run rather than at the door. A
            visitor who has just gone down on leg five has something worth
            keeping; one who has seen nothing yet does not.
          */}
          {!currentUser && (
            <div className="border-t border-line-hairline bg-ink-700 px-5 py-6">
              <Label tag="///" className="mb-3">
                Not Recorded
              </Label>
              <p className="m-0 mb-5 max-w-[52ch] text-sm leading-normal text-mute-400">
                This run was graded but not saved. Create an account to keep
                your trail results, track accuracy by knowledge area, and appear
                in the standings.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/register"
                  className={buttonClass({ variant: "signal", size: "md" })}
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className={buttonClass({ variant: "outline", size: "md" })}
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line-hairline px-5 py-4">
            <Link
              href="/quiz"
              className={buttonClass({ variant: "outline", size: "md" })}
            >
              Take an Untimed Run
            </Link>
            {currentUser && (
              <Link
                href="/profile"
                className={buttonClass({ variant: "ghost", size: "md" })}
              >
                View Record
              </Link>
            )}
          </div>
        </Panel>
      </div>
    );
  };

  // ── Routing between them ─────────────────────────────────────────────────

  // Order is the flow. The verdict for the question just answered comes before
  // the crossing it triggered, and the ending beat comes before the numbers.
  if (!state) return alreadyFlown ? renderSpent(alreadyFlown) : renderBriefing();
  if (verdict) return renderVerdict(state, verdict);
  if (crossing !== null) return renderCrossing(crossing);
  if (state.status !== "FLYING")
    return endingSeen ? renderDebrief(state) : renderEnding(state);
  return leg ? renderQuestion(state, leg) : renderDebrief(state);
}
