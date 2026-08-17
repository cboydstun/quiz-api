"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CombinedGraphQLErrors,
  gql,
  type TypedDocumentNode,
} from "@apollo/client";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Alert,
  Button,
  Checkbox,
  Panel,
  Spinner,
  TextField,
} from "@/components/ds";
import type { Role, User } from "@/types";

const LOGIN_MUTATION: TypedDocumentNode<LoginResult, LoginVars> = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

const GET_GOOGLE_AUTH_URL: TypedDocumentNode<GoogleAuthUrlResult> = gql`
  query GetGoogleAuthUrl {
    getGoogleAuthUrl {
      url
    }
  }
`;

const AUTHENTICATE_WITH_GOOGLE: TypedDocumentNode<
  AuthenticateWithGoogleResult,
  AuthenticateWithGoogleVars
> = gql`
  mutation AuthenticateWithGoogle($code: String!) {
    authenticateWithGoogle(code: $code) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

interface AuthPayload {
  token: string;
  user: User;
}

interface LoginResult {
  login: AuthPayload | null;
}
interface LoginVars {
  email: string;
  password: string;
}

interface GoogleAuthUrlResult {
  getGoogleAuthUrl: { url: string } | null;
}

interface AuthenticateWithGoogleResult {
  authenticateWithGoogle: AuthPayload | null;
}
interface AuthenticateWithGoogleVars {
  code: string;
}

const GENERIC_AUTH_ERROR =
  "Login failed. Please check your credentials and try again.";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, loading: authLoading, login: authLogin } = useAuth();

  const [login] = useMutation(LOGIN_MUTATION);
  const [getGoogleAuthUrl] = useLazyQuery(GET_GOOGLE_AUTH_URL);
  const [authenticateWithGoogle] = useMutation(AUTHENTICATE_WITH_GOOGLE);

  // A Google auth code is single-use. Latch it so a re-render (or Strict Mode's
  // double mount) cannot exchange the same code twice.
  const exchangedCodeRef = useRef<string | null>(null);

  const redirectBasedOnRole = useCallback(
    (role: Role) => {
      switch (role) {
        case "SUPER_ADMIN":
        case "ADMIN":
        case "EDITOR":
          router.push("/management");
          break;
        case "USER":
          router.push("/quiz");
          break;
        default:
          setError("Invalid user role");
      }
    },
    [router],
  );

  const handleAuthenticationSuccess = useCallback(
    (authData: AuthPayload) => {
      redirectBasedOnRole(authData.user.role);
    },
    [redirectBasedOnRole],
  );

  const handleGoogleAuthentication = useCallback(
    async (code: string) => {
      try {
        const { data } = await authenticateWithGoogle({ variables: { code } });
        const payload = data?.authenticateWithGoogle;
        if (!payload) {
          setError("Google authentication failed. Please try again.");
          return;
        }
        await authLogin(payload.token);
        handleAuthenticationSuccess(payload);
      } catch (err: unknown) {
        let errorMessage = "Google authentication failed. Please try again.";
        if (CombinedGraphQLErrors.is(err) && err.errors.length > 0) {
          errorMessage = err.errors[0].message;
        }
        setError(errorMessage);
      }
    },
    [authenticateWithGoogle, authLogin, handleAuthenticationSuccess],
  );

  useEffect(() => {
    if (!authLoading && user) {
      redirectBasedOnRole(user.role);
    }
  }, [authLoading, user, redirectBasedOnRole]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code || exchangedCodeRef.current === code) return;
    exchangedCodeRef.current = code;
    handleGoogleAuthentication(code);
  }, [handleGoogleAuthentication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      const result = await login({ variables: { email, password } });
      const payload = result.data?.login;
      if (!payload) {
        setError(GENERIC_AUTH_ERROR);
        return;
      }
      await authLogin(payload.token);
      handleAuthenticationSuccess(payload);
    } catch (err: unknown) {
      if (CombinedGraphQLErrors.is(err) && err.errors.length > 0) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message || "An error occurred. Please try again.");
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      console.error(err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data } = await getGoogleAuthUrl();
      const url = data?.getGoogleAuthUrl?.url;
      if (!url) {
        setError("Failed to initiate Google Sign-In. Please try again.");
        return;
      }
      window.location.href = url;
    } catch (err: unknown) {
      setError("Failed to initiate Google Sign-In. Please try again.");
      console.error(err);
    }
  };

  if (authLoading) {
    return <Spinner label="Authenticating" />;
  }

  if (user) {
    return null; // The useEffect hook will handle the redirection
  }

  return (
    <div className="flex justify-center px-8 py-24">
      <div className="w-full max-w-form">
        <Panel label="Authenticate" tag="///" padding="lg">
          <h1 className="m-0 mb-6 text-xl font-medium tracking-tight text-bone-100">
            Sign in to continue
          </h1>

          {error && (
            <div className="mb-5">
              <Alert tone="abort">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              id="email-address"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="mb-6 flex items-center justify-between">
              <Checkbox
                id="remember-me"
                name="remember-me"
                label="Remember this device"
              />
            </div>

            <Button type="submit" variant="signal" size="md" fullWidth>
              Sign In
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-line-hairline" />
            <span className="label-mono text-mute-500">Or continue with</span>
            <div className="h-px flex-1 bg-line-hairline" />
          </div>

          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleGoogleSignIn}
            icon={
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width={16}
                height={16}
              />
            }
          >
            Sign in with Google
          </Button>
        </Panel>

        <div className="mt-4 text-center">
          <Link
            href="/register"
            className="label-mono text-mute-500 transition-fast hover:text-signal"
          >
            Request access instead
          </Link>
        </div>
      </div>
    </div>
  );
}
