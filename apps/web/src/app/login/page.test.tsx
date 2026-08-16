import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRecordingClient } from "@/test-utils/apollo";
import { routerMock } from "../../../vitest.setup";
import LoginPage from "./page";

const authLogin = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: authLogin,
    logout: vi.fn(),
  }),
}));

const authPayload = (role: string) => ({
  __typename: "AuthPayload",
  token: "jwt-123",
  user: {
    __typename: "User",
    id: "1",
    username: "amelia",
    email: "amelia@example.com",
    role,
  },
});

beforeEach(() => {
  authLogin.mockClear();
  window.history.replaceState({}, "", "/login");
});

describe("LoginPage — email/password", () => {
  const signIn = async () => {
    await userEvent.type(
      screen.getByPlaceholderText("Email address"),
      "amelia@example.com",
    );
    await userEvent.type(screen.getByPlaceholderText("Password"), "hunter2");
    await userEvent.click(screen.getByRole("button", { name: /sign in$/i }));
  };

  it.each([
    ["SUPER_ADMIN", "/management"],
    ["ADMIN", "/management"],
    ["EDITOR", "/management"],
    ["USER", "/quiz"],
  ])("redirects a %s to %s", async (role, destination) => {
    const { Provider } = createRecordingClient(() => ({
      data: { login: authPayload(role) },
    }));
    render(
      <Provider>
        <LoginPage />
      </Provider>,
    );

    await signIn();

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith(destination),
    );
    expect(authLogin).toHaveBeenCalledWith("jwt-123");
  });

  it("shows an error instead of throwing when the payload is null", async () => {
    // errorPolicy is "all", so a partial response yields data.login === null
    // with no error raised. This used to dereference straight through.
    const { Provider } = createRecordingClient(() => ({
      data: { login: null },
    }));
    render(
      <Provider>
        <LoginPage />
      </Provider>,
    );

    await signIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /check your credentials/i,
    );
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("LoginPage — Google OAuth callback", () => {
  it("exchanges the ?code= parameter exactly once", async () => {
    // A Google auth code is single-use. The callback effect depended on a
    // callback that was rebuilt every render, so it re-fired on each render and
    // re-exchanged the same code.
    window.history.replaceState({}, "", "/login?code=one-time-code");

    const { Provider, countOf, operations } = createRecordingClient(() => ({
      data: { authenticateWithGoogle: authPayload("USER") },
    }));

    render(
      <Provider>
        <LoginPage />
      </Provider>,
    );

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/quiz"));
    // Let any stray re-render-triggered effect run before asserting.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(countOf("AuthenticateWithGoogle")).toBe(1);
    expect(operations[0].variables).toEqual({ code: "one-time-code" });
    expect(authLogin).toHaveBeenCalledOnce();
  });

  it("reports a failed exchange instead of throwing", async () => {
    window.history.replaceState({}, "", "/login?code=bad-code");
    const { Provider } = createRecordingClient(() => ({
      data: { authenticateWithGoogle: null },
    }));

    render(
      <Provider>
        <LoginPage />
      </Provider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Google authentication failed/i,
    );
  });

  it("does not navigate when the Google auth URL is missing", async () => {
    const { Provider } = createRecordingClient(() => ({
      data: { getGoogleAuthUrl: null },
    }));

    render(
      <Provider>
        <LoginPage />
      </Provider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /sign in with google/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Failed to initiate Google Sign-In/i,
    );
  });
});
