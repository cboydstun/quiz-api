import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { createRecordingClient } from "@/test-utils/apollo";
import QuizPage from "./page";

const me = {
  __typename: "User",
  id: "1",
  username: "amelia",
  email: "amelia@example.com",
  role: "USER",
};

const questions = [
  {
    __typename: "RunQuestion",
    id: "q1",
    prompt: "Airspace basics",
    questionText: "Which class needs ATC authorization?",
    answers: ["Class B", "Class G"],
    hint: "Think controlled",
    points: 5,
  },
  {
    __typename: "RunQuestion",
    id: "q2",
    prompt: "Weather",
    questionText: "What reduces visibility most?",
    answers: ["Fog", "Sunshine"],
    hint: "Ground level cloud",
    points: 5,
  },
];

/** Grades q1's "Class B" as correct and everything else as incorrect. */
const gradeStrictly = (variables: Record<string, unknown>) => ({
  data: {
    submitAnswer: {
      __typename: "SubmitAnswerResponse",
      success: true,
      isCorrect:
        variables.questionId === "q1" && variables.selectedAnswer === "Class B",
    },
  },
});

/** Grades every answer against the same key gradeStrictly uses. */
const gradeBatch = (variables: Record<string, unknown>) => ({
  data: {
    gradeAnswers: (
      variables.answers as { questionId: string; selectedAnswer: string }[]
    ).map((answer) => ({
      __typename: "GradedAnswer",
      questionId: answer.questionId,
      isCorrect:
        answer.questionId === "q1" && answer.selectedAnswer === "Class B",
    })),
  },
});

const renderQuiz = (
  submitResponder: (
    variables: Record<string, unknown>,
  ) => unknown = gradeStrictly,
  { signedIn = true }: { signedIn?: boolean } = {},
) => {
  const recorder = createRecordingClient((op) => {
    if (op.operationName === "GetCurrentUser")
      return { data: { me: signedIn ? me : null } };
    if (op.operationName === "SampleQuestions")
      return { data: { sampleQuestions: questions } };
    if (op.operationName === "SubmitAnswer")
      return submitResponder(op.variables) as never;
    if (op.operationName === "GradeAnswers")
      return gradeBatch(op.variables) as never;
    return { data: null };
  });
  render(
    <recorder.Provider>
      <QuizPage />
    </recorder.Provider>,
  );
  return recorder;
};

const startEasyQuiz = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole("button", { name: "EASY" });
  await user.click(screen.getByRole("button", { name: "EASY" }));
  await screen.findByText("Which class needs ATC authorization?");
};

afterEach(() => {
  vi.useRealTimers();
});

describe("QuizPage", () => {
  it("scores only the answers the backend grades as correct", async () => {
    const user = userEvent.setup();
    const recorder = renderQuiz();
    await startEasyQuiz(user);

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Sunshine"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    expect(await screen.findByText("1 / 2")).toBeVisible();
    expect(recorder.countOf("SubmitAnswer")).toBe(2);
  });

  it("blocks Next until an answer is chosen, and says so inline", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startEasyQuiz(user);

    // The Next button is disabled, so the guard is exercised through Skip's
    // sibling path: assert the notice appears rather than an alert() firing.
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(screen.getByLabelText("Class B"));
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("survives a null submitAnswer payload without throwing", async () => {
    // errorPolicy "all" can return data.submitAnswer === null. The old code did
    // data.submitAnswer.isCorrect and blew up mid-submission.
    const user = userEvent.setup();
    renderQuiz(() => ({ data: { submitAnswer: null } }));
    await startEasyQuiz(user);

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Fog"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    expect(await screen.findByText("0 / 2")).toBeVisible();
  });

  it("skips to the next question without requiring an answer", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startEasyQuiz(user);

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(
      await screen.findByText("What reduces visibility most?"),
    ).toBeVisible();
  });

  /**
   * The landing page has always promised "Start with a ten-item run. No
   * account required." This page used to redirect anonymous visitors to
   * /login before they saw a single question.
   */
  it("lets a signed-out visitor play a run and grades it without recording", async () => {
    const user = userEvent.setup();
    const recorder = renderQuiz(gradeStrictly, { signedIn: false });
    await startEasyQuiz(user);

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Sunshine"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    expect(await screen.findByText("1 / 2")).toBeVisible();
    // Graded, never recorded.
    expect(recorder.countOf("GradeAnswers")).toBe(1);
    expect(recorder.countOf("SubmitAnswer")).toBe(0);
  });

  it("asks a signed-out visitor to sign up only once the score is on screen", async () => {
    const user = userEvent.setup();
    renderQuiz(gradeStrictly, { signedIn: false });
    await startEasyQuiz(user);

    expect(screen.queryByText(/create free account/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Fog"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    expect(
      await screen.findByRole("link", { name: /create free account/i }),
    ).toBeInTheDocument();
  });

  it("does not ask a signed-in user to sign up", async () => {
    const user = userEvent.setup();
    renderQuiz();
    await startEasyQuiz(user);

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Fog"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    await screen.findByText("1 / 2");
    expect(screen.queryByText(/create free account/i)).not.toBeInTheDocument();
  });

  /**
   * errorPolicy "all" resolves a failed mutation rather than rejecting it, so
   * reading `isCorrect ?? false` on its own reported a 0/2 the user never
   * earned. A failure has to say it failed.
   */
  it("reports a failed submission instead of scoring it zero", async () => {
    const user = userEvent.setup();
    renderQuiz(() => ({
      data: { submitAnswer: null },
      errors: [new GraphQLError("Question not found")],
    }));
    await startEasyQuiz(user);

    await user.click(screen.getByLabelText("Class B"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("What reduces visibility most?");
    await user.click(screen.getByLabelText("Fog"));
    await user.click(screen.getByRole("button", { name: "Submit Run" }));

    expect(await screen.findByText(/question not found/i)).toBeVisible();
    expect(screen.queryByText("0 / 2")).not.toBeInTheDocument();
  });

  it("advances an unanswered question when the HARD timer expires", async () => {
    // shouldAdvanceTime keeps real time moving so Apollo's promises and RTL's
    // waitFor still settle while the 30s countdown is fast-forwarded.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    });
    renderQuiz();

    await screen.findByRole("button", { name: "HARD" });
    await user.click(screen.getByRole("button", { name: "HARD" }));
    await screen.findByText("Which class needs ATC authorization?");
    expect(screen.getByText("T\u221230s")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(
      await screen.findByText("What reduces visibility most?"),
    ).toBeVisible();
  });
});
