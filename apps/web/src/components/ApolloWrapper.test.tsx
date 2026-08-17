import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect } from "react";
import { ApolloWrapper } from "./ApolloWrapper";

const PING = gql`
  query Ping {
    ping
  }
`;

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

function Probe() {
  useQuery(PING);
  return null;
}

function LoginProbe() {
  const [login] = useMutation(LOGIN);
  useEffect(() => {
    login({ variables: { email: "a@b.com", password: "wrong" } }).catch(
      () => {},
    );
  }, [login]);
  return null;
}

/**
 * Covers the two links rewritten for Apollo Client 4. Neither behaviour is
 * exercised anywhere else in the suite: no other test inspects outgoing request
 * headers, and no other test drives the error link.
 *
 * The error link is the one that genuinely changed shape - v3 handed the
 * handler { graphQLErrors, networkError }, v4 hands it a single `error` that
 * has to be narrowed with CombinedGraphQLErrors.is() before .errors is
 * reachable. Get that wrong and expired sessions stop being cleared.
 */
describe("ApolloWrapper auth link", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ data: { ping: "pong" } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const headersOfFirstRequest = () => {
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    return new Headers(init.headers);
  };

  it("sends the stored token as a bearer credential", async () => {
    localStorage.setItem("token", "tok-123");

    render(
      <ApolloWrapper>
        <Probe />
      </ApolloWrapper>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(headersOfFirstRequest().get("authorization")).toBe("Bearer tok-123");
  });

  it("clears the stored token when the server reports it is unauthorized", async () => {
    localStorage.setItem("token", "stale-token");
    // jsdom has no navigation; the error link assigns location.href on 401.
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      set href(v: string) {
        assign(v);
      },
    });

    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({ errors: [{ message: "unauthorized" }], data: null }),
    }));

    render(
      <ApolloWrapper>
        <Probe />
      </ApolloWrapper>,
    );

    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    expect(assign).toHaveBeenCalledWith("/login");
  });

  /**
   * A wrong password comes back as "Unauthenticated: Invalid credentials",
   * which matches the same substring rule as a dead token. Acting on it here
   * hard-navigates to /login and wipes the error message the login page just
   * set, so a typo looks like the site reloading for no reason.
   */
  it("does not log the user out when the login mutation itself fails", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      set href(v: string) {
        assign(v);
      },
    });

    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({
          errors: [{ message: "Unauthenticated: Invalid credentials" }],
          data: null,
        }),
    }));

    render(
      <ApolloWrapper>
        <LoginProbe />
      </ApolloWrapper>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Give the error link the microtask it would need to redirect.
    await Promise.resolve();
    expect(assign).not.toHaveBeenCalled();
  });

  it("sends an empty authorization header when no token is stored", async () => {
    render(
      <ApolloWrapper>
        <Probe />
      </ApolloWrapper>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(headersOfFirstRequest().get("authorization")).toBe("");
  });
});
