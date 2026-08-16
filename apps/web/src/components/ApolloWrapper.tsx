// src/components/ApolloWrapper.tsx
"use client";

import {
  ApolloClient,
  CombinedGraphQLErrors,
  createHttpLink,
  from,
  InMemoryCache,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { ErrorLink } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import { ReactNode, useMemo } from "react";
import { AuthProvider } from "../contexts/AuthContext";

const httpLink = createHttpLink({
  // Same-origin: the GraphQL endpoint is a route handler in this app
  // (src/app/v1/graphql/route.ts), so a relative URI is all that is needed
  // and NEXT_PUBLIC_API_URL only exists to point at a different backend.
  uri: process.env.NEXT_PUBLIC_API_URL || "/v1/graphql",
});

// Apollo Client 4's ContextSetter takes (prevContext, operation) — the reverse
// of v3's setContext((operation, prevContext)). The previous context is the
// first argument now, so `headers` is destructured off it directly.
const authLink = new SetContextLink(({ headers }) => {
  // Only access localStorage on the client side
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// v4 hands the handler a single `error` rather than separate graphQLErrors /
// networkError fields. GraphQL errors arrive wrapped in CombinedGraphQLErrors,
// which narrows via its static is() and exposes them on `.errors`.
const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
      if (
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("unauthenticated")
      ) {
        // Handle unauthorized errors only on the client side
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    });
    return;
  }
  console.log(`[Network error]: ${error}`);
});

export function ApolloWrapper({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new ApolloClient({
        link: from([errorLink, authLink, httpLink]),
        cache: new InMemoryCache(),
        defaultOptions: {
          watchQuery: {
            fetchPolicy: "network-only",
            nextFetchPolicy: "cache-first",
            errorPolicy: "all",
          },
          query: {
            fetchPolicy: "network-only",
            errorPolicy: "all",
          },
          mutate: {
            errorPolicy: "all",
          },
        },
      }),
    [],
  );

  return (
    <ApolloProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </ApolloProvider>
  );
}
