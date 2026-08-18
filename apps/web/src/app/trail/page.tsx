"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Alert,
  Button,
  buttonClass,
  Label,
  Meter,
  Panel,
  QuestionCard,
  Readout,
  Spinner,
  Status,
} from "@/components/ds";
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
      legs {
        index
        domain
        terrain
        hazard
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
  questions: TrailQuestion[];
}
interface DailyTrailResult {
  dailyTrail: { date: string; legs: TrailLeg[] } | null;
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
   * Daylight. The clock only ticks — it is reset where the run actually moves
   * (`begin` and `resume`), not from inside the effect, because resetting it
   * here would be a setState in an effect body and a cascading render for
   * every question.
   */
  useEffect(() => {
    if (!flying || verdict) return;

    const timer = setInterval(() => {
      setDaylight((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [flying, verdict]);

  /** Clears the verdict and hands the next question a fresh clock. */
  const resume = () => {
    setVerdict(null);
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
    if (!flying || verdict || grading || expiredRef.current) return;
    expiredRef.current = true;
    void commit(selected);
  }, [daylight, flying, verdict, grading, selected, commit]);

  const begin = () => {
    setState(startRun(legs));
    setDebrief([]);
    setVerdict(null);
    setSelected(null);
    setNotice(null);
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
      <p className="m-0 mb-10 max-w-[62ch] text-sm leading-normal text-mute-500">
        Every operator flies this same route today. {legs.length} legs,{" "}
        {totalQuestions} questions, one attempt. A wrong answer costs{" "}
        {TRAIL_RULES.MISS_COST}% battery; a wrong answer over a hazard costs{" "}
        {TRAIL_RULES.HAZARD_DAMAGE}% airframe. Run either to zero and the run
        ends where it ended.
      </p>

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

  const renderInstruments = (run: TrailState) => (
    <div className="mb-px grid grid-cols-1 gap-px bg-line-hairline sm:grid-cols-3">
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
    const over = run.status !== "FLYING";

    return (
      <div className="mx-auto max-w-mid px-4 py-16 sm:px-8">
        {renderInstruments(run)}
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
            <Button
              variant="signal"
              size="md"
              onClick={resume}
              autoFocus
            >
              {over ? "Debrief" : "Continue"}
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
          <div className="grid grid-cols-2 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-4">
            <div className="bg-ink-800">
              <Readout
                label="Reached"
                value={`${run.legIndex + 1} / ${legs.length}`}
                tone={arrived ? "go" : "abort"}
              />
            </div>
            <div className="bg-ink-800">
              <Readout label="Correct" value={`${run.correct} / ${run.answered}`} />
            </div>
            <div className="bg-ink-800">
              <Readout label="Battery" value={run.battery} unit="%" />
            </div>
            <div className="bg-ink-800">
              <Readout label="Airframe" value={run.airframe} unit="%" />
            </div>
          </div>

          <div className="px-5 py-5">
            <p className="m-0 max-w-[62ch] text-sm leading-normal text-mute-400">
              {arrived
                ? `You flew all ${legs.length} legs and landed with ${run.battery}% charge.`
                : run.airframe === 0
                  ? `The airframe failed on ${legs[run.legIndex]?.terrain ?? "the leg"}. ${run.legIndex + 1} of ${legs.length} legs.`
                  : `Charge ran out on ${legs[run.legIndex]?.terrain ?? "the leg"}. ${run.legIndex + 1} of ${legs.length} legs.`}
            </p>
          </div>

          {/* The review. Only the misses carry a correction — repeating a
              right answer back is noise. */}
          <div className="flex flex-col gap-2 px-5 pb-5">
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

  if (!state) return alreadyFlown ? renderSpent(alreadyFlown) : renderBriefing();
  if (verdict) return renderVerdict(state, verdict);
  if (state.status !== "FLYING") return renderDebrief(state);
  return leg ? renderQuestion(state, leg) : renderDebrief(state);
}
