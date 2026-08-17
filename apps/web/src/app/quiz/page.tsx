"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  buttonClass,
  Label,
  Panel,
  QuestionCard,
  Readout,
  Spinner,
  Status,
  Modal,
} from "@/components/ds";
import Link from "next/link";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { trackEvent } from "@/lib/analytics";
import { messageFrom } from "@/lib/errors";
import type { QuizQuestion, User } from "@/types";

/**
 * Still asked for, but no longer a gate: a null `me` means the visitor is
 * signed out and their run is graded rather than recorded.
 */
const GET_CURRENT_USER: TypedDocumentNode<GetCurrentUserResult> = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      role
    }
  }
`;

/**
 * The run feed. Public and randomised, so this one document serves signed-in
 * and signed-out visitors alike — and neither is sent the answer key, which
 * the old `questions` query included on every item whether it was asked for
 * or not.
 */
const GET_RUN_QUESTIONS: TypedDocumentNode<
  GetRunQuestionsResult,
  GetRunQuestionsVars
> = gql`
  query SampleQuestions($limit: Int) {
    sampleQuestions(limit: $limit) {
      id
      prompt
      questionText
      answers
      hint
      points
    }
  }
`;

const SUBMIT_ANSWER: TypedDocumentNode<SubmitAnswerResult, SubmitAnswerVars> =
  gql`
    mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
      submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
        success
        isCorrect
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
      }
    }
  `;

interface GetCurrentUserResult {
  me: User | null;
}

interface GetRunQuestionsResult {
  sampleQuestions: QuizQuestion[] | null;
}
interface GetRunQuestionsVars {
  limit: number;
}

interface SubmitAnswerResult {
  submitAnswer: { success: boolean; isCorrect: boolean } | null;
}
interface SubmitAnswerVars {
  questionId: string;
  selectedAnswer: string;
}

interface GradeAnswersResult {
  gradeAnswers: { questionId: string; isCorrect: boolean }[] | null;
}
interface GradeAnswersVars {
  answers: { questionId: string; selectedAnswer: string }[];
}

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type QuestionCount = 10 | 20 | 50 | 100 | 200 | "infinite";

/** What "All" asks for. The server clamps to the same ceiling. */
const RUN_MAX = 200;

const SECONDS_PER_QUESTION: Record<Difficulty, number | null> = {
  EASY: null,
  MEDIUM: 60,
  HARD: 30,
};

export default function QuizPage() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{
    score: number;
    totalQuestions: number;
    breakdown: { questionId: string; isCorrect: boolean }[];
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // No redirect. The landing page offers this run without an account and now
  // it genuinely works without one: an anonymous visitor plays, is graded, and
  // is asked to sign in at the results screen — where there is finally
  // something worth signing in for. `me` failing just means "signed out".
  const { loading: userLoading, data: userData } = useQuery(GET_CURRENT_USER);
  const currentUser = userData?.me ?? null;

  const {
    loading: questionsLoading,
    error: questionsError,
    data: questionsData,
    refetch: refetchQuestions,
  } = useQuery(GET_RUN_QUESTIONS, {
    variables: {
      limit: questionCount === "infinite" ? RUN_MAX : questionCount,
    },
  });
  const [submitAnswer] = useMutation(SUBMIT_ANSWER);
  const [gradeAnswers] = useMutation(GRADE_ANSWERS);

  // The server already applied the limit and the random order — no slicing
  // here. Slicing a createdAt-ordered bank client-side is exactly what made
  // every run identical.
  const questions = useMemo(
    () => questionsData?.sampleQuestions ?? [],
    [questionsData],
  );

  const resetTimer = useCallback(() => {
    setTimeRemaining(difficulty ? SECONDS_PER_QUESTION[difficulty] : null);
  }, [difficulty]);

  const handleSubmitQuiz = useCallback(async () => {
    const totalQuestions = questions.length;
    const answers = Object.entries(userAnswers).map(
      ([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }),
    );

    try {
      let breakdown: { questionId: string; isCorrect: boolean }[];

      if (currentUser) {
        // One round trip per answer, but issued concurrently rather than
        // serially. These are recorded: they move score and domain accuracy.
        const results = await Promise.all(
          answers.map(({ questionId, selectedAnswer }) =>
            submitAnswer({ variables: { questionId, selectedAnswer } }),
          ),
        );

        // errorPolicy is "all", so a rejected mutation resolves with data null
        // rather than throwing. Reading `isCorrect ?? false` on its own turned
        // a failed submission into a straight-faced 0/10 the user did not earn.
        const failure = results.find(
          (result) => !result.data?.submitAnswer && result.error,
        );
        if (failure) throw failure.error;

        breakdown = results.map((result, i) => ({
          questionId: answers[i]!.questionId,
          isCorrect: result.data?.submitAnswer?.isCorrect ?? false,
        }));
      } else {
        // Signed out: one round trip, graded and thrown away.
        const result = await gradeAnswers({ variables: { answers } });
        if (!result.data?.gradeAnswers) throw result.error;
        breakdown = result.data.gradeAnswers;
      }

      const score = breakdown.filter((entry) => entry.isCorrect).length;

      setQuizSubmitted(true);
      setQuizScore({ score, totalQuestions, breakdown });
      trackEvent("quiz_complete", {
        signed_in: Boolean(currentUser),
        difficulty,
        items: totalQuestions,
        score,
      });
      if (!currentUser) trackEvent("quiz_signup_prompt");
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setNotice(
        messageFrom(err, "There was an error submitting your run. Try again."),
      );
    }
  }, [
    questions.length,
    userAnswers,
    submitAnswer,
    gradeAnswers,
    currentUser,
    difficulty,
  ]);

  // Moves to the next question (or submits) without requiring an answer.
  // Used by Skip and by the timer, which must never leave the quiz stuck.
  const advanceQuestion = useCallback(() => {
    if (questions.length === 0) return;

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowHint(false);
      resetTimer();
    } else {
      setTimeRemaining(null);
      handleSubmitQuiz();
    }
  }, [currentQuestionIndex, questions.length, resetTimer, handleSubmitQuiz]);

  const handleNextQuestion = useCallback(() => {
    if (questions.length === 0) return;

    const currentQuestionId = questions[currentQuestionIndex]?.id;
    if (currentQuestionId && userAnswers[currentQuestionId]) {
      setNotice(null);
      advanceQuestion();
    } else {
      setNotice("Please select an answer before moving to the next question.");
    }
  }, [currentQuestionIndex, questions, userAnswers, advanceQuestion]);

  // One interval per question, not one per second. Keyed on the question index
  // so the countdown restarts when the question changes, and reads the latest
  // value through the functional updater instead of a `timeRemaining` dep.
  const isTimedRound =
    difficulty !== null && SECONDS_PER_QUESTION[difficulty] !== null;
  useEffect(() => {
    if (!isTimedRound || quizSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prevTime) =>
        prevTime === null ? null : Math.max(0, prevTime - 1),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimedRound, currentQuestionIndex, quizSubmitted]);

  // Time up: advance regardless of whether the question was answered. The ref
  // latch keeps a single zero-crossing from advancing more than once.
  const timeoutHandledRef = useRef(false);
  useEffect(() => {
    if (timeRemaining === null || timeRemaining > 0) {
      timeoutHandledRef.current = false;
      return;
    }
    if (quizSubmitted || timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    advanceQuestion();
  }, [timeRemaining, quizSubmitted, advanceQuestion]);

  if (userLoading || questionsLoading) return <Spinner label="Loading bank" />;

  if (questionsError)
    return (
      <div className="mx-auto max-w-mid px-8 py-16">
        <Alert tone="abort">
          Error loading questions. Please try again later.
        </Alert>
      </div>
    );

  // An empty bank used to render `null`: a blank white page with no
  // explanation, on the app's main route.
  if (questions.length === 0)
    return (
      <div className="mx-auto max-w-mid px-8 py-16">
        <Alert tone="caution" kicker="EMPTY">
          No questions are available yet. Check back shortly.
        </Alert>
      </div>
    );

  const handleDifficultySelection = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setTimeRemaining(SECONDS_PER_QUESTION[selectedDifficulty]);
    trackEvent("quiz_start", {
      signed_in: Boolean(currentUser),
      difficulty: selectedDifficulty,
      items: questionCount,
    });
  };

  const handleQuestionCountSelection = (count: QuestionCount) => {
    setQuestionCount(count);
  };

  const handleAnswerSelection = (questionId: string, answer: string) => {
    setNotice(null);
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSkipQuestion = () => {
    setNotice(null);
    advanceQuestion();
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setNotice(null);
      setCurrentQuestionIndex((prev) => prev - 1);
      setShowHint(false);
      resetTimer();
    }
  };

  const handleQuit = () => {
    setShowQuitConfirmation(true);
  };

  const resetQuiz = () => {
    setDifficulty(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setTimeRemaining(null);
    setShowHint(false);
    setNotice(null);
    // The variables have not changed, so nothing would refetch on its own and
    // "New Run" would deal the same hand again.
    refetchQuestions().catch((err) =>
      console.error("Error loading a new run:", err),
    );
  };

  const confirmQuit = () => {
    resetQuiz();
    setShowQuitConfirmation(false);
  };

  const LEVELS: {
    level: Difficulty;
    tone: "go" | "caution" | "abort";
    clock: string;
    detail: string;
  }[] = [
    {
      level: "EASY",
      tone: "go",
      clock: "No clock",
      detail: "Full scenario prompt. Hint available on request.",
    },
    {
      level: "MEDIUM",
      tone: "caution",
      clock: "60s / item",
      detail: "Prompt shown. Hint available on request.",
    },
    {
      level: "HARD",
      tone: "abort",
      clock: "30s / item",
      detail: "Question and answers only. No hint, no prompt.",
    },
  ];

  const COUNTS: QuestionCount[] = [10, 20, 50, 100, 200, "infinite"];

  const renderRunConfiguration = () => (
    <div className="mx-auto max-w-mid px-8 py-16">
      <Label tag="///" className="mb-6">
        Run Configuration
      </Label>
      <h1 className="m-0 mb-10 text-2xl font-medium tracking-tight text-bone-100">
        Configure evaluation run
      </h1>

      <Panel
        label="Item Count"
        meta={questionCount === "infinite" ? "ALL" : String(questionCount)}
        padding="md"
        className="mb-px"
      >
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((count) => (
            <Button
              key={String(count)}
              variant="outline"
              size="sm"
              selected={questionCount === count}
              onClick={() => handleQuestionCountSelection(count)}
            >
              {count === "infinite" ? "All" : count}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel label="Difficulty" padding="none">
        <div className="grid gap-px bg-line-hairline md:grid-cols-3">
          {LEVELS.map((level) => (
            <div key={level.level} className="bg-ink-800 p-5">
              <Status tone={level.tone} filled>
                {level.level}
              </Status>
              <div className="mt-4 mb-2 font-mono text-3xs uppercase tracking-label text-mute-400">
                {level.clock}
              </div>
              <p className="m-0 mb-5 text-sm leading-normal text-mute-500">
                {level.detail}
              </p>
              {/*
                The button is named for the level rather than a generic
                "Select" — three buttons all reading "Select" are ambiguous to
                a screen reader, and the test suite addresses them by name.
              */}
              <Button
                variant={level.tone}
                size="sm"
                fullWidth
                onClick={() => handleDifficultySelection(level.level)}
              >
                {level.level}
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderRunComplete = () => {
    const score = quizScore?.score ?? 0;
    const total = quizScore?.totalQuestions ?? 0;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const points = questions.reduce((sum, question) => {
      const entry = quizScore?.breakdown.find(
        (b) => b.questionId === question.id,
      );
      return entry?.isCorrect ? sum + question.points : sum;
    }, 0);

    return (
      <div className="mx-auto max-w-mid px-8 py-16">
        <Panel
          label="Run Complete"
          tag="///"
          meta={difficulty ?? undefined}
          padding="none"
        >
          <div className="grid grid-cols-1 gap-px border-b border-line-hairline bg-line-hairline sm:grid-cols-3">
            <div className="bg-ink-800">
              <Readout label="Score" value={`${score} / ${total}`} />
            </div>
            <div className="bg-ink-800">
              <Readout
                label="Accuracy"
                value={accuracy}
                unit="%"
                tone={accuracy >= 70 ? "go" : "abort"}
              />
            </div>
            <div className="bg-ink-800">
              <Readout label="Points" value={points} unit="pts" />
            </div>
          </div>

          <div className="flex flex-col gap-2 p-5">
            {questions.map((question, i) => {
              const entry = quizScore?.breakdown.find(
                (b) => b.questionId === question.id,
              );
              const answered = entry !== undefined;
              const ok = entry?.isCorrect ?? false;
              return (
                <div
                  key={question.id}
                  className={`flex items-center gap-4 border border-line-hairline border-l-2 bg-ink-700 px-4 py-3 ${
                    !answered
                      ? "border-l-line-strong"
                      : ok
                        ? "border-l-go"
                        : "border-l-abort"
                  }`}
                >
                  <span className="font-mono text-3xs tracking-mono text-mute-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm text-mute-400">
                    {question.questionText}
                  </span>
                  <Status tone={!answered ? "neutral" : ok ? "go" : "abort"}>
                    {!answered ? "Skipped" : ok ? "Correct" : "Missed"}
                  </Status>
                </div>
              );
            })}
          </div>

          {/*
            The wall, placed here rather than at the door. A visitor who has
            just finished a run and been given a real score has a reason to
            keep the result; one who has seen nothing yet does not.
          */}
          {!currentUser && (
            <div className="border-t border-line-hairline bg-ink-700 px-5 py-6">
              <Label tag="///" className="mb-3">
                Not Recorded
              </Label>
              <p className="m-0 mb-5 max-w-[52ch] text-sm leading-normal text-mute-400">
                This run was graded but not saved. Create an account to keep
                your score, track accuracy by domain, and appear in the
                standings.
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

          <div className="flex gap-2 border-t border-line-hairline px-5 py-4">
            <Button variant="signal" size="md" onClick={resetQuiz}>
              New Run
            </Button>
          </div>
        </Panel>
      </div>
    );
  };

  const renderQuestion = () => {
    const question = questions[currentQuestionIndex];
    if (!question) return null;

    const isLast = currentQuestionIndex === questions.length - 1;
    const isAnswered = Boolean(userAnswers[question.id]);
    const tone =
      difficulty === "EASY"
        ? "go"
        : difficulty === "MEDIUM"
          ? "caution"
          : "abort";

    return (
      <div className="mx-auto max-w-mid px-8 py-16">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Label tag="///">
            {currentUser?.username ?? "Guest"} · {difficulty} run ·{" "}
            {questionCount === "infinite" ? "all" : questionCount} items
          </Label>
          {difficulty && (
            <Status tone={tone} filled>
              {difficulty}
            </Status>
          )}
        </div>

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
          label="Evaluation"
          index={currentQuestionIndex + 1}
          total={questions.length}
          points={question.points}
          timeRemaining={timeRemaining}
          prompt={difficulty !== "HARD" ? question.prompt : undefined}
          questionText={question.questionText}
          answers={question.answers}
          selected={userAnswers[question.id]}
          onSelect={(answer) => handleAnswerSelection(question.id, answer)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentQuestionIndex === 0}
                onClick={handlePreviousQuestion}
              >
                Previous
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={handleQuit}>
                  Abort
                </Button>
                {!isLast && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkipQuestion}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  variant="signal"
                  size="sm"
                  disabled={!isAnswered}
                  onClick={isLast ? handleSubmitQuiz : handleNextQuestion}
                >
                  {isLast ? "Submit Run" : "Next"}
                </Button>
              </div>
            </div>
          }
        >
          {difficulty !== "HARD" && question.hint && (
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
                    {question.hint}
                  </Alert>
                </div>
              )}
            </div>
          )}
        </QuestionCard>

        <Modal
          open={showQuitConfirmation}
          label="Confirm"
          title="Abort this run?"
          onDismiss={() => setShowQuitConfirmation(false)}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuitConfirmation(false)}
              >
                Cancel
              </Button>
              <Button variant="abort" size="sm" onClick={confirmQuit}>
                Abort Run
              </Button>
            </>
          }
        >
          Progress for this run will not be recorded.
        </Modal>
      </div>
    );
  };

  if (!difficulty || !questionCount) return renderRunConfiguration();
  if (quizSubmitted) return renderRunComplete();
  return renderQuestion();
}
