import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRecordingClient } from "@/test-utils/apollo";
import { setReducedMotion } from "../../../vitest.setup";
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

const MISSION = [
  "County wants the bluff line before the winter storms.",
  "Eight waypoints down the coast road, one battery cart.",
];

/** Two legs of one question each: short enough to fly to the end in a test. */
const legs = [
  {
    __typename: "TrailLeg",
    index: 1,
    domain: "Weather sources",
    terrain: "ICING LAYER",
    hazard: true,
    dispatch: ["Ceiling coming down.", "Airframe picking up rime."],
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
    dispatch: ["Class B shelf steps down over the next ridge."],
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
          dailyTrail: {
            __typename: "DailyTrail",
            date: TRAIL_DATE,
            mission: MISSION,
            legs,
          },
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

type User = ReturnType<typeof userEvent.setup>;

/** Dismisses a crossing beat and puts the operator on the leg's first question. */
const cross = async (user: User) => {
  await user.click(await screen.findByRole("button", { name: "Fly the leg" }));
};

/** Launch, then through the leg-one crossing to the first question. */
const launch = async (user: User) => {
  await screen.findByRole("button", { name: "Launch" });
  await user.click(screen.getByRole("button", { name: "Launch" }));
  await cross(user);
  await screen.findByText("What reduces visibility most?");
};

/** Picks an answer, commits it, and clears the verdict screen. */
const answer = async (user: User, choice: string) => {
  await user.click(screen.getByRole("radio", { name: new RegExp(choice) }));
  await user.click(screen.getByRole("button", { name: "Commit" }));
  await user.click(await screen.findByRole("button", { name: "Continue" }));
};

/** Flies both legs to the end and clears the ending beat. */
const flyToTheEnd = async (user: User, second = "Class B") => {
  await launch(user);
  await answer(user, "Fog");
  await cross(user);
  await answer(user, second);
  await user.click(await screen.findByRole("button", { name: "Debrief" }));
};

beforeEach(() => {
  window.localStorage.clear();
  // These tests are about the flow, not the reveal. Reduced motion makes every
  // transmission render whole on first paint; Teletype.test.tsx owns the typing
  // itself.
  setReducedMotion(true);
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

  // The job is what makes eight knowledge areas read as a day's work rather
  // than a list of categories.
  it("briefs the day's job before launch", async () => {
    renderTrail();

    for (const line of MISSION) {
      expect(await screen.findByText(new RegExp(line))).toBeInTheDocument();
    }
  });

  it("puts a crossing between launch and the first question", async () => {
    const user = userEvent.setup();
    renderTrail();

    await user.click(await screen.findByRole("button", { name: "Launch" }));

    expect(
      await screen.findByText(/Ceiling coming down/),
    ).toBeInTheDocument();
    // The question is behind the crossing, not beside it.
    expect(
      screen.queryByText("What reduces visibility most?"),
    ).not.toBeInTheDocument();

    await cross(user);
    expect(
      await screen.findByText("What reduces visibility most?"),
    ).toBeInTheDocument();
  });

  it("names the terrain being entered on each crossing", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);
    await answer(user, "Fog");

    expect(
      await screen.findByText(/Class B shelf steps down/),
    ).toBeInTheDocument();
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
    await answer(user, "Fog");
    await cross(user);

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
    await flyToTheEnd(user, "Class G");

    expect(await screen.findByText("Arrived")).toBeInTheDocument();
    expect(
      screen.getByText("Class B sits over the busiest fields."),
    ).toBeInTheDocument();
  });

  // The ending is the one place the fiction gets to land the outcome, so the
  // debrief can stay a scoreboard.
  it("plays an ending beat before the numbers", async () => {
    const user = userEvent.setup();
    renderTrail();
    await launch(user);
    await answer(user, "Fog");
    await cross(user);
    await answer(user, "Class B");

    expect(await screen.findByText(/The client gets the shots/)).toBeInTheDocument();
    // The debrief's review list is still behind it.
    expect(screen.queryByText("Reached")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Debrief" }));
    expect(await screen.findByText("Reached")).toBeInTheDocument();
  });

  it("records a signed-in run so the day is spent", async () => {
    const user = userEvent.setup();
    const recorder = renderTrail();
    await flyToTheEnd(user);

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
    await flyToTheEnd(user);

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
    await flyToTheEnd(user);

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
    await flyToTheEnd(user);

    const reached = (await screen.findByText("Reached")).parentElement;
    expect(within(reached as HTMLElement).getByText("2 / 2")).toBeInTheDocument();
  });
});
