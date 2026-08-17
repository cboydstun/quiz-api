import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { createRecordingClient } from "@/test-utils/apollo";
import { routerMock } from "../../../vitest.setup";
import ProfilePage from "./page";

const profile = (
  domainAccuracy: {
    domain: string;
    answered: number;
    correct: number;
    accuracy: number;
  }[],
) => ({
  __typename: "User",
  id: "u1",
  username: "operator",
  email: "operator@example.com",
  role: "USER",
  score: 3720,
  questionsAnswered: 812,
  questionsCorrect: 640,
  questionsIncorrect: 172,
  skills: [],
  lifetimePoints: 3720,
  yearlyPoints: 0,
  monthlyPoints: 0,
  dailyPoints: 0,
  consecutiveLoginDays: 12,
  lastLoginDate: "1786920000000",
  createdAt: "1740000000000",
  updatedAt: "1786920000000",
  domainAccuracy: domainAccuracy.map((d) => ({
    __typename: "DomainAccuracy",
    ...d,
  })),
});

const renderPage = (respond: Parameters<typeof createRecordingClient>[0]) => {
  const client = createRecordingClient(respond);
  render(
    <client.Provider>
      <ProfilePage />
    </client.Provider>,
  );
  return client;
};

const withProfile = (
  domainAccuracy: Parameters<typeof profile>[0] = [],
  overrides: Record<string, unknown> = {},
) =>
  renderPage(({ operationName }) => {
    if (operationName === "GetUserProfile") {
      return { data: { me: profile(domainAccuracy) } };
    }
    if (operationName === "UpdateLoginStreak") {
      return {
        data: {
          updateLoginStreak: {
            __typename: "User",
            id: "u1",
            consecutiveLoginDays: 12,
            lastLoginDate: "1786920000000",
          },
        },
      };
    }
    return (overrides[operationName] as never) ?? { data: null };
  });

describe("ProfilePage — accuracy by domain", () => {
  it("renders a bar per domain with its percentage and tally", async () => {
    withProfile([
      { domain: "Regulations", answered: 40, correct: 38, accuracy: 95 },
      { domain: "Weather", answered: 20, correct: 9, accuracy: 45 },
    ]);

    expect(await screen.findByText("Regulations")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    // The tally shares a span with the percentage, so match on the fragment.
    expect(screen.getByText(/38\/40/)).toBeInTheDocument();
    expect(screen.getByText("Weather")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("colours the bar by how strong the domain is", async () => {
    withProfile([
      { domain: "Regulations", answered: 40, correct: 38, accuracy: 95 },
      { domain: "Weather", answered: 20, correct: 9, accuracy: 45 },
    ]);

    expect((await screen.findByText("95%")).className).toContain("text-go");
    expect(screen.getByText("45%").className).toContain("text-abort");
  });

  it("explains an empty breakdown rather than showing nothing", async () => {
    // The state every user is in today: the bank is unclassified, so there is
    // no domain data to show and that is correct rather than broken.
    withProfile([]);

    expect(
      await screen.findByText(/no classified answers yet/i),
    ).toBeInTheDocument();
  });
});

describe("ProfilePage — access", () => {
  /**
   * The page used to render the backend's "Authorization header must be
   * provided" verbatim to anonymous visitors. That message contains neither
   * "unauthorized" nor "unauthenticated", so the Apollo error link ignores it
   * and nothing moved the visitor along — the page just sat there quoting the
   * wire protocol at them.
   */
  it("sends a signed-out visitor to /login instead of showing the wire error", async () => {
    renderPage(({ operationName }) => {
      if (operationName === "GetUserProfile") {
        return {
          data: null,
          errors: [new GraphQLError("Authorization header must be provided")],
        };
      }
      return { data: null };
    });

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/login"));
    expect(
      screen.queryByText(/authorization header must be provided/i),
    ).not.toBeInTheDocument();
  });

  /**
   * errorPolicy is "all": `data` and `error` arrive together. domainAccuracy
   * runs its own requireSelfOrAdmin, so it can fail while `me` is perfectly
   * fine — that must not blank the whole record.
   */
  it("still renders the record when only a sub-field failed", async () => {
    renderPage(({ operationName }) => {
      if (operationName === "GetUserProfile") {
        return {
          data: { me: { ...profile([]), domainAccuracy: null } },
          errors: [new GraphQLError("Forbidden: not your record")],
        };
      }
      return { data: null };
    });

    expect(await screen.findByText("operator")).toBeInTheDocument();
    expect(screen.getByText(/forbidden: not your record/i)).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("ProfilePage — behaviour", () => {
  it("records the login streak exactly once", async () => {
    // The ref latch exists because the effect used to re-fire on every render,
    // advancing the streak repeatedly in a single visit.
    const { countOf } = withProfile([]);

    await screen.findByText("operator");
    await waitFor(() => expect(countOf("UpdateLoginStreak")).toBe(1));

    // Give any stray re-render-triggered effect a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(countOf("UpdateLoginStreak")).toBe(1);
  });

  it("refuses a mismatched password without calling the mutation", async () => {
    const user = userEvent.setup();
    const { countOf } = withProfile([]);

    await screen.findByText("operator");
    await user.type(screen.getByLabelText("Current Password"), "old-secret");
    await user.type(screen.getByLabelText("New Password"), "new-secret-1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "new-secret-2",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/new passwords do not match/i),
    ).toBeInTheDocument();
    expect(countOf("UpdatePassword")).toBe(0);
  });

  it("sends the password change once both fields agree", async () => {
    const user = userEvent.setup();
    const client = renderPage(({ operationName }) => {
      if (operationName === "GetUserProfile")
        return { data: { me: profile([]) } };
      if (operationName === "UpdateLoginStreak")
        return { data: { updateLoginStreak: null } };
      if (operationName === "UpdatePassword")
        return {
          data: {
            updatePassword: {
              __typename: "UpdatePasswordResponse",
              success: true,
              message: "Password updated",
            },
          },
        };
      return { data: null };
    });

    await screen.findByText("operator");
    await user.type(screen.getByLabelText("Current Password"), "old-secret");
    await user.type(screen.getByLabelText("New Password"), "new-secret-1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "new-secret-1",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText("Password updated")).toBeInTheDocument();
    expect(client.countOf("UpdatePassword")).toBe(1);
  });
});
