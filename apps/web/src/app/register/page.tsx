"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { gql, type TypedDocumentNode } from "@apollo/client";
import {
  useApolloClient,
  useLazyQuery,
  useMutation,
} from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Button, Panel, TextField } from "@/components/ds";
import { messageFrom } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import type { Role } from "@/types";
import Link from "next/link";

const REGISTER_USER: TypedDocumentNode<RegisterUserResult, RegisterUserVars> =
  gql`
    mutation RegisterUser($input: CreateUserInput!) {
      register(input: $input) {
        token
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

interface GoogleAuthUrlResult {
  getGoogleAuthUrl: { url: string } | null;
}

interface RegisterUserResult {
  register: { token: string } | null;
}
interface RegisterUserVars {
  input: {
    username: string;
    email: string;
    password: string;
    role: Role;
  };
}

const RegisterPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [registerUser] = useMutation(REGISTER_USER);
  const [getGoogleAuthUrl] = useLazyQuery(GET_GOOGLE_AUTH_URL);
  const [error, setError] = useState("");
  const client = useApolloClient();

  // Google's redirect URI is registered for /login, so the exchange happens
  // there. This only starts the handoff.
  const handleGoogleSignUp = async () => {
    try {
      const { data } = await getGoogleAuthUrl();
      const url = data?.getGoogleAuthUrl?.url;
      if (!url) {
        setError("Failed to start Google sign-up. Please try again.");
        return;
      }
      window.location.href = url;
    } catch (err) {
      setError(messageFrom(err, "Failed to start Google sign-up."));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement)
      .value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    try {
      const result = await registerUser({
        variables: {
          input: {
            username,
            email,
            password,
            role: "USER",
          },
        },
      });

      if (!result.data?.register) {
        // errorPolicy is "all", so this resolved rather than threw and the
        // server's message is on `result.error`, not in the catch below.
        setError(
          messageFrom(result.error, "Registration failed. Please try again."),
        );
        return;
      }
      login(result.data.register.token);
      trackEvent("sign_up", { method: "password" });
      await client.resetStore();
      // Straight into a run. /profile is every counter at zero, which is the
      // least convincing thing a new account can be shown.
      router.push("/quiz");
    } catch (err) {
      setError(messageFrom(err, "An error occurred during registration"));
    }
  };

  return (
    <div className="flex justify-center px-4 py-16 sm:px-8 sm:py-24">
      <div className="w-full max-w-form">
        {/*
          Named for what it is. "Request Access" reads as an application
          somebody has to approve — a strange thing to say to a visitor who
          arrived from a link and can sign up in ten seconds.
        */}
        <Panel label="Create Account" tag="///" padding="lg">
          <h1 className="m-0 mb-6 text-xl font-medium tracking-tight text-bone-100">
            Create an operator account
          </h1>

          {error && (
            <div className="mb-5">
              <Alert tone="abort">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              id="username"
              name="username"
              label="Callsign"
              type="text"
              required
              placeholder="Username"
            />
            <TextField
              id="email-address"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
            />
            <TextField
              id="password"
              name="password"
              label="Password"
              type="password"
              // Not "current-password": that makes a password manager offer a
              // saved credential here instead of generating a new one.
              autoComplete="new-password"
              required
              placeholder="Password"
              hint="Minimum 8 characters"
            />

            <Button type="submit" variant="signal" size="md" fullWidth>
              Create Free Account
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-line-hairline" />
            <span className="label-mono text-mute-500">Or continue with</span>
            <div className="h-px flex-1 bg-line-hairline" />
          </div>

          {/*
            The same handoff /login offers. Sending a cold visitor to the one
            page without it meant the higher-friction path was the default for
            everyone arriving from a link.
          */}
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleGoogleSignUp}
            icon={
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width={16}
                height={16}
              />
            }
          >
            Sign up with Google
          </Button>
        </Panel>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="label-mono text-mute-500 transition-fast hover:text-signal"
          >
            Already have an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
