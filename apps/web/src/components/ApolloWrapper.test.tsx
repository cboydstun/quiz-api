import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { ApolloWrapper } from "./ApolloWrapper";

const PING = gql`
  query Ping {
    ping
  }
`;

function Probe() {
  useQuery(PING);
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
