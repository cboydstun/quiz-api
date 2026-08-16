import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gql } from "@apollo/client";
import { type MockedResponse } from "@apollo/client/testing";
import { MockedProvider } from "@apollo/client/testing/react";
import { AuthProvider, useAuth } from "./AuthContext";

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      role
    }
  }
`;

const meMock: MockedResponse = {
  request: { query: GET_CURRENT_USER },
  result: {
    data: {
      me: {
        __typename: "User",
        id: "1",
        username: "amelia",
        email: "amelia@example.com",
        role: "ADMIN",
      },
    },
  },
};

function Probe() {
  const { user, loading, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.username ?? "anonymous"}</span>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

const renderWithAuth = (mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={mocks}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MockedProvider>,
  );

describe("AuthProvider", () => {
  it("reports loading until the stored token has been read", async () => {
    // The token lives in localStorage, which is only readable after mount. If
    // loading flipped to false first, protected pages would bounce to /login.
    renderWithAuth();
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
  });

  it("loads the current user when a token is present", async () => {
    localStorage.setItem("token", "jwt-123");
    renderWithAuth([meMock]);

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("amelia"),
    );
  });

  it("clears the stored token and the user on logout", async () => {
    localStorage.setItem("token", "jwt-123");
    renderWithAuth([meMock]);

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("amelia"),
    );

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(localStorage.getItem("token")).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("anonymous"),
    );
  });

  it("throws when used outside the provider", () => {
    const Orphan = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Orphan />)).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
  });
});
