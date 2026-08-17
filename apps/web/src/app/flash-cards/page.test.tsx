import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRecordingClient } from "@/test-utils/apollo";
import FlashCardsPage from "./page";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "operator", email: "o@e.com", role: "USER" },
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

interface Card {
  id: string;
  questionText: string;
  correctAnswer: string;
  domain: string | null;
}

const CARDS: Card[] = [
  {
    id: "1",
    questionText: "Maximum altitude for a small UA?",
    correctAnswer: "400 feet AGL",
    domain: "Regulations",
  },
  {
    id: "2",
    questionText: "Minimum flight visibility?",
    correctAnswer: "3 statute miles",
    domain: "Weather",
  },
  {
    id: "3",
    questionText: "Maximum groundspeed?",
    correctAnswer: "87 knots",
    domain: "Regulations",
  },
];

const toQuestion = (card: Card) => ({
  __typename: "Question",
  id: card.id,
  prompt: "p",
  questionText: card.questionText,
  answers: [card.correctAnswer, "something else"],
  correctAnswer: card.correctAnswer,
  domain: card.domain,
  createdBy: { __typename: "User", id: "e1", username: "editor" },
});

const renderPage = (cards: Card[] = CARDS) => {
  const client = createRecordingClient(({ operationName, variables }) => {
    if (operationName === "GetQuestionIds") {
      const domain = variables.domain as string | null;
      const visible = domain ? cards.filter((c) => c.domain === domain) : cards;
      return {
        data: {
          questions: visible.map((c) => ({ __typename: "Question", id: c.id })),
        },
      };
    }
    if (operationName === "GetQuestionDomains") {
      return { data: { questionDomains: ["Regulations", "Weather"] } };
    }
    if (operationName === "GetQuestion") {
      const card = cards.find((c) => c.id === variables.id);
      return { data: { question: card ? toQuestion(card) : null } };
    }
    return { data: null };
  });

  render(
    <client.Provider>
      <FlashCardsPage />
    </client.Provider>,
  );
  return client;
};

/** The value beneath a readout label, e.g. Mastered. */
const readout = (label: string) =>
  within(screen.getByText(label).parentElement!).getAllByText(/^\d+$/)[0]!
    .textContent;

describe("FlashCardsPage — triage", () => {
  it("shows the first card in the deck", async () => {
    renderPage();
    expect(
      await screen.findByText("Maximum altitude for a small UA?"),
    ).toBeInTheDocument();
  });

  it("Got It masters the card and moves to the next", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    expect(readout("Mastered")).toBe("0");

    await user.click(screen.getByRole("button", { name: /got it/i }));

    expect(
      await screen.findByText("Minimum flight visibility?"),
    ).toBeInTheDocument();
    expect(readout("Mastered")).toBe("1");
    expect(readout("Reviewed")).toBe("1");
  });

  it("Again sends the card to the back of the queue", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    await user.click(screen.getByRole("button", { name: /^again$/i }));

    // Second card is up, the first is requeued rather than mastered.
    expect(
      await screen.findByText("Minimum flight visibility?"),
    ).toBeInTheDocument();
    expect(readout("Mastered")).toBe("0");
    expect(readout("Requeued")).toBe("1");

    // Clear the rest of the deck; the requeued card comes back round.
    await user.click(screen.getByRole("button", { name: /got it/i }));
    await screen.findByText("Maximum groundspeed?");
    await user.click(screen.getByRole("button", { name: /got it/i }));

    expect(
      await screen.findByText("Maximum altitude for a small UA?"),
    ).toBeInTheDocument();
  });

  it("clears the deck once every card is mastered", async () => {
    const user = userEvent.setup();
    renderPage([CARDS[0]!]);

    await screen.findByText("Maximum altitude for a small UA?");
    await user.click(screen.getByRole("button", { name: /got it/i }));

    expect(
      await screen.findByText(/all 1 cards mastered/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /run again/i }),
    ).toBeInTheDocument();
  });
});

describe("FlashCardsPage — keyboard", () => {
  // The handler ignores events originating on a BUTTON, since the card face is
  // itself a button. These dispatch with nothing focused, which is the only way
  // the assertion means anything.
  it("2 masters the current card", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    await user.keyboard("2");

    expect(
      await screen.findByText("Minimum flight visibility?"),
    ).toBeInTheDocument();
    expect(readout("Mastered")).toBe("1");
  });

  it("1 requeues the current card", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    await user.keyboard("1");

    expect(
      await screen.findByText("Minimum flight visibility?"),
    ).toBeInTheDocument();
    expect(readout("Mastered")).toBe("0");
    expect(readout("Requeued")).toBe("1");
  });

  it("Space reveals the answer", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    const card = screen.getByRole("button", { name: /reveal answer/i });
    expect(card).toHaveAttribute("aria-pressed", "false");

    await user.keyboard(" ");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /show prompt/i }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });
});

describe("FlashCardsPage — domain filter", () => {
  it("refetches for the chosen domain and restarts the session", async () => {
    const user = userEvent.setup();
    const { operations } = renderPage();

    await screen.findByText("Maximum altitude for a small UA?");
    await user.click(screen.getByRole("button", { name: /got it/i }));
    await screen.findByText("Minimum flight visibility?");
    expect(readout("Mastered")).toBe("1");

    await user.click(screen.getByRole("button", { name: /^weather$/i }));

    await waitFor(() => {
      const domains = operations
        .filter((op) => op.operationName === "GetQuestionIds")
        .map((op) => op.variables.domain);
      expect(domains).toContain("Weather");
    });

    // Only the Weather card remains, and the counters start over.
    expect(
      await screen.findByText("Minimum flight visibility?"),
    ).toBeInTheDocument();
    await waitFor(() => expect(readout("Mastered")).toBe("0"));
  });
});
