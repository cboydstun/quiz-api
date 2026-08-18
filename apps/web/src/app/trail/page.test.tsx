import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRecordingClient } from "@/test-utils/apollo";
import TrailPage from "./page";
import { TRAIL_RULES } from "./engine";

const me = {
  __typename: "User",
  id: "1",
  username: "amelia",
  email: "amelia@example.com",
  role: "USER",
};

const TRAIL_DATE = "2026-08-17";

/** Two legs of one question each: short enough to fly to the end in a test. */
const legs = [
  {
    __typename: "TrailLeg",
    index: 1,
    domain: "Weather sources",
    terrain: "ICING LAYER",
    hazard: true,
    questions: [
      {
        __typename: "RunQuestion",
        id: "q1",
        prompt: "A front is moving in.",
        questionText: "What reduces visibility most?",
        answers: ["Fog", "Sunshine"],
        hint: "Ground level cloud",
        points: 5,
      },
    ],
  },
  {
    __typename: "TrailLeg",
    index: 2,
    domain: "Airspace classification",
    terrain: "THE SHELF",
    hazard: false,
    questions: [
      {
        __typename: "RunQuestion",
        id: "q2",
        prompt: "Approaching a Class B shelf.",
        questionText: "Which class needs ATC authorization?",
        answers: ["Class B", "Class G"],
        hint: "Think controlled",
        points: 5,
      },
    ],
  },
];

const ANSWER_KEY: Record<string, { correct: string; explanation: string }> = {
  q1: { correct: "Fog", explanation: "Fog is cloud at the surface." },
  q2: { correct: "Class B", explanation: "Class B sits over the busiest fields." },
};

const graded = (questionId: string, selectedAnswer: string) => {
  const key = ANSWER_KEY[questionId];
  return {
    isCorrect: key?.correct === selectedAnswer,
    correctAnswer: key?.correct ?? "",
    explanation: key?.explanation ?? null,
  };
};

interface Options {
  signedIn?: boolean;
  myTrailRun?: Record<string, unknown> | null;
}

const renderTrail = ({ signedIn = true, myTrailRun = null }: Options = {}) => {
  const recorder = createRecordingClient((op) => {
    if (op.operationName === "GetCurrentUser")
      return { data: { me: signedIn ? me : null } };
    if (op.operationName === "DailyTrail")
      return {
        data: {
          dailyTrail: { __typename: "DailyTrail", date: TRAIL_DATE, legs },
        },
      };
    if (op.operationName === "MyTrailRun") return { data: { myTrailRun } };
    if (op.operationName === "SubmitAnswer")
      return {
        data: {
          submitAnswer: {
            __typename: "SubmitAnswerResponse",
            success: true,
            ...graded(
              op.variables.questionId as string,
              op.variables.selectedAnswer as string,
            ),
          },
        },
      };
    if (op.operationName === "GradeAnswers") {
      const answers = op.variables.answers as {
        questionId: string;
        selectedAnswer: string;
      }[];
      return {
        data: {
          gradeAnswers: answers.map((answer) => ({
            __typename: "GradedAnswer",
            questionId: answer.questionId,
            ...graded(answer.questionId, answer.selectedAnswer),
          })),
        },
      };
    }
    if (op.operationName === "RecordTrailRun")
      return {
        data: {
          recordTrailRun: {
            __typename: "TrailRun",
            ...(op.variables.input as Record<string, unknown>),
          },
        },
      };
    return { data: null };
  });

  render(
    <recorder.Provider>
      <TrailPage />
    </recorder.Provider>,
  );
  return recorder;
};

const launch = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole("button", { name: "Launch" });
  await user.click(screen.getByRole("button", { name: "Launch" }));
  await screen.findByText("What reduces visibility most?");
};

/** Picks an answer, commits it, and clears the verdict screen. */
const answer = async (
  user: ReturnType<typeof userEvent.setup>,
  choice: string,
  next: "Continue" | "Debrief",
) => {
  await user.click(screen.getByRole("radio", { name: new RegExp(choice) }));
  await user.click(screen.getByRole("button", { name: "Commit" }));
  await user.click(await screen.findByRole("button", { name: next }));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TrailPage", () => {
  it("briefs the route before launch, hazards marked", async () => {
    renderTrail();

    expect(await screen.findByText("ICING LAYER")).toBeInTheDocument();
    expect(screen.getByText("THE SHELF")).toBeInTheDocument();
    expect(screen.getByText("Hazard")).toBeInTheDocument();
  });

  it("opens with a full airframe and one leg's transit already spent", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);

    expect(
      screen.getByRole("meter", { name: "Battery" }),
    ).toHaveAttribute(
      "aria-valuenow",
      String(TRAIL_RULES.START_BATTERY - TRAIL_RULES.TRANSIT_COST),
    );
    expect(screen.getByRole("meter", { name: "Airframe" })).toHaveAttribute(
      "aria-valuenow",
      String(TRAIL_RULES.START_AIRFRAME),
    );
  });

  // The trail's whole difference from /quiz: damage lands before the next
  // question is drawn, not in a batch at the end.
  it("charges a miss over a hazard leg to both battery and airframe", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);

    await user.click(screen.getByRole("radio", { name: /Sunshine/ }));
    await user.click(screen.getByRole("button", { name: "Commit" }));

    expect(await screen.findByText("Missed")).toBeInTheDocument();
    // These legs hold one question each, so the miss also ends the leg: the
    // instruments on the verdict screen are live state, already carrying the
    // crossing into leg two.
    expect(screen.getByRole("meter", { name: "Battery" })).toHaveAttribute(
      "aria-valuenow",
      String(
        TRAIL_RULES.START_BATTERY -
          TRAIL_RULES.TRANSIT_COST * 2 -
          TRAIL_RULES.MISS_COST,
      ),
    );
    expect(screen.getByRole("meter", { name: "Airframe" })).toHaveAttribute(
      "aria-valuenow",
      String(TRAIL_RULES.START_AIRFRAME - TRAIL_RULES.HAZARD_DAMAGE),
    );
  });

  it("explains a miss before moving on", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);

    await user.click(screen.getByRole("radio", { name: /Sunshine/ }));
    await user.click(screen.getByRole("button", { name: "Commit" }));

    expect(
      await screen.findByText("Fog is cloud at the surface."),
    ).toBeInTheDocument();
  });

  it("crosses to the next leg once its questions are answered", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);
    await answer(user, "Fog", "Continue");

    expect(
      await screen.findByText("Which class needs ATC authorization?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Battery" })).toHaveAttribute(
      "aria-valuenow",
      String(TRAIL_RULES.START_BATTERY - TRAIL_RULES.TRANSIT_COST * 2),
    );
  });

  it("debriefs on arrival with every question reviewed", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);
    await answer(user, "Fog", "Continue");
    await answer(user, "Class G", "Debrief");

    expect(await screen.findByText("Arrived")).toBeInTheDocument();
    expect(
      screen.getByText("Class B sits over the busiest fields."),
    ).toBeInTheDocument();
  });

  it("records a signed-in run so the day is spent", async () => {
    const user = userEvent.setup();
    const recorder = renderTrail();
    await launch(user);
    await answer(user, "Fog", "Continue");
    await answer(user, "Class B", "Debrief");

    await screen.findByText("Arrived");
    const recorded = recorder.operations.find(
      (op) => op.operationName === "RecordTrailRun",
    );
    expect(recorded?.variables.input).toMatchObject({
      trailDate: TRAIL_DATE,
      legsReached: 2,
      completed: true,
      correct: 2,
      total: 2,
    });
  });

  // The wall belongs at the end of the run, not at the door: a visitor who
  // just flew the trail has something worth keeping.
  it("lets a signed-out visitor fly, then asks for an account", async () => {
    const user = userEvent.setup();
    const recorder = renderTrail({ signedIn: false });
    await launch(user);
    await answer(user, "Fog", "Continue");
    await answer(user, "Class B", "Debrief");

    expect(
      await screen.findByRole("link", { name: "Create Free Account" }),
    ).toBeInTheDocument();
    expect(recorder.countOf("RecordTrailRun")).toBe(0);
    expect(recorder.countOf("SubmitAnswer")).toBe(0);
    expect(recorder.countOf("GradeAnswers")).toBe(2);
  });

  it("keeps a signed-out run out of the record entirely", async () => {
    const user = userEvent.setup();
    renderTrail({ signedIn: false });
    await launch(user);
    await answer(user, "Fog", "Continue");
    await answer(user, "Class B", "Debrief");

    await screen.findByRole("link", { name: "Create Free Account" });
    expect(window.localStorage.getItem(`trail:flown:${TRAIL_DATE}`)).not.toBeNull();
  });

  it("refuses a second attempt once the day is flown", async () => {
    renderTrail({
      myTrailRun: {
        __typename: "TrailRun",
        trailDate: TRAIL_DATE,
        legsReached: 1,
        completed: false,
        batteryLeft: 0,
        airframeLeft: 50,
        correct: 1,
        total: 3,
      },
    });

    expect(await screen.findByText("Trail Flown")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Launch" }),
    ).not.toBeInTheDocument();
  });

  it("refuses a second attempt for a signed-out visitor too", async () => {
    window.localStorage.setItem(
      `trail:flown:${TRAIL_DATE}`,
      JSON.stringify({
        trailDate: TRAIL_DATE,
        legsReached: 2,
        completed: true,
        batteryLeft: 40,
        airframeLeft: 100,
        correct: 2,
        total: 2,
      }),
    );

    renderTrail({ signedIn: false });

    expect(await screen.findByText("Trail Flown")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Launch" }),
    ).not.toBeInTheDocument();
  });

  it("cannot commit before an answer is chosen", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);

    expect(screen.getByRole("button", { name: "Commit" })).toBeDisabled();
  });

  it("says there is nothing to fly when no question is classified", async () => {
    const recorder = createRecordingClient((op) => {
      if (op.operationName === "GetCurrentUser") return { data: { me: null } };
      if (op.operationName === "DailyTrail")
        return {
          data: {
            dailyTrail: {
              __typename: "DailyTrail",
              date: TRAIL_DATE,
              legs: [],
            },
          },
        };
      return { data: null };
    });

    render(
      <recorder.Provider>
        <TrailPage />
      </recorder.Provider>,
    );

    expect(await screen.findByText(/nothing to fly/)).toBeInTheDocument();
  });

  it("shows the debrief's outcome readout, not just a score", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);
    await answer(user, "Fog", "Continue");
    await answer(user, "Class B", "Debrief");

    const reached = (await screen.findByText("Reached")).parentElement;
    expect(within(reached as HTMLElement).getByText("2 / 2")).toBeInTheDocument();
  });
});
