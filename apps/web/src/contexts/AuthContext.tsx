// src/contexts/AuthContext.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useApolloClient, useQuery } from "@apollo/client/react";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null | undefined;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GET_CURRENT_USER: TypedDocumentNode<GetCurrentUserResult> = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      role
      # Feeds the navbar's streak chip. Cheap — it is a column on the row the
      # query already reads.
      consecutiveLoginDays
    }
  }
`;

interface GetCurrentUserResult {
  me: User | null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // True until the stored token has been read on the client. Without this,
  // consumers see loading=false with user=null on the first render and
  // redirect to /login before the token is available.
  const [initializing, setInitializing] = useState(true);
  const client = useApolloClient();

  useEffect(() => {
    // Check for token in localStorage only on the client side
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(storedToken);
    setInitializing(false);
  }, []);

  const {
    loading: queryLoading,
    error,
    data,
    refetch,
  } = useQuery(GET_CURRENT_USER, {
    skip: !token,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (data?.me) {
      setUser(data.me);
    }
  }, [data]);

  const login = useCallback(
    (newToken: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
      }
      setToken(newToken);
      refetch();
    },
    [refetch],
  );

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setToken(null);
    setUser(null);
    client.resetStore();
  }, [client]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: initializing || queryLoading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
