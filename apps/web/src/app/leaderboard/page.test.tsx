import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRecordingClient } from "@/test-utils/apollo";
import LeaderboardPage from "./page";

const viewer = {
  id: "4",
  username: "operator",
  email: "operator@example.com",
  role: "USER" as const,
};

let mockUser: typeof viewer | null = viewer;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const entry = (position: number, username: string, score: number) => ({
  __typename: "LeaderboardEntry",
  position,
  score,
  user: {
    __typename: "LeaderboardUser",
    username,
    score,
  },
});

const board = (count: number) => ({
  __typename: "LeaderboardResponse",
  leaderboard: Array.from({ length: count }, (_, i) =>
    entry(i + 1, `pilot${i + 1}`, 5000 - i * 100),
  ),
  currentUserEntry: entry(4, "operator", 4700),
});

const me = {
  __typename: "User",
  id: "4",
  questionsAnswered: 100,
  questionsCorrect: 88,
};

const renderPage = (respond: Parameters<typeof createRecordingClient>[0]) => {
  const client = createRecordingClient(respond);
  render(
    <client.Provider>
      <LeaderboardPage />
    </client.Provider>,
  );
  return client;
};

const signedIn = () => {
  mockUser = viewer;
};
const signedOut = () => {
  mockUser = null;
};

describe("LeaderboardPage", () => {
  it("renders the standings in position order", async () => {
    signedIn();
    renderPage(({ operationName }) =>
      operationName === "GetMyAccuracy"
        ? { data: { me } }
        : { data: { getLeaderboard: board(3) } },
    );

    const rows = await screen.findAllByRole("row");
    // Header plus three operators.
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText("pilot1")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("pilot3")).toBeInTheDocument();
  });

  it("washes the viewer's own row in signal", async () => {
    signedIn();
    renderPage(({ operationName }) =>
      operationName === "GetMyAccuracy"
        ? { data: { me } }
        : { data: { getLeaderboard: board(6) } },
    );

    await screen.findByText("pilot1");
    const rows = screen.getAllByRole("row");
    // currentUserEntry is position 4, so body row 4 — index 4 counting header.
    expect(rows[4]!.className).toContain("bg-signal-wash");
    expect(rows[1]!.className).not.toContain("bg-signal-wash");
  });

  it("derives the accuracy readout from the viewer's own record", async () => {
    signedIn();
    renderPage(({ operationName }) =>
      operationName === "GetMyAccuracy"
        ? { data: { me } }
        : { data: { getLeaderboard: board(6) } },
    );

    // 88 of 100 answered. Scoped to the readout: "04" is also the viewer's
    // position cell in the table below.
    expect(await screen.findByText("88")).toBeInTheDocument();
    const position = screen.getByText("Your Position").parentElement!;
    expect(within(position).getByText("04")).toBeInTheDocument();
  });

  it("never issues an authenticated query while signed out", async () => {
    // /leaderboard is public and has no route guard. An authenticated query
    // firing here would fail for anonymous visitors and bounce them to /login
    // through ApolloWrapper's error link.
    signedOut();
    const { countOf } = renderPage(() => ({
      data: {
        getLeaderboard: { ...board(3), currentUserEntry: null },
      },
    }));

    await screen.findByText("pilot1");
    expect(countOf("GetMyAccuracy")).toBe(0);
    expect(screen.queryByText("Your Position")).toBeNull();
  });

  it("asks for a larger page when Load More is pressed", async () => {
    signedIn();
    const user = userEvent.setup();
    const { operations } = renderPage(({ operationName }) =>
      operationName === "GetMyAccuracy"
        ? { data: { me } }
        : { data: { getLeaderboard: board(10) } },
    );

    await screen.findByText("pilot1");
    await user.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => {
      const limits = operations
        .filter((op) => op.operationName === "GetLeaderboard")
        .map((op) => op.variables.limit);
      expect(limits).toContain(20);
    });
  });

  it("disables the control once the server returns a short page", async () => {
    signedIn();
    renderPage(({ operationName }) =>
      operationName === "GetMyAccuracy"
        ? { data: { me } }
        : { data: { getLeaderboard: board(3) } },
    );

    // Three rows against a limit of ten means there is nothing more to fetch.
    expect(
      await screen.findByRole("button", { name: /end of standings/i }),
    ).toBeDisabled();
  });
});
