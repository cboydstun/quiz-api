"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, Button, Panel, TextField } from "@/components/ds";
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
  const [error, setError] = useState("");
  const client = useApolloClient();

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
      const { data } = await registerUser({
        variables: {
          input: {
            username,
            email,
            password,
            role: "USER",
          },
        },
      });

      if (!data?.register) {
        setError("Registration failed. Please try again.");
        return;
      }
      login(data.register.token);
      await client.resetStore();
      router.push("/profile");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during registration",
      );
    }
  };

  return (
    <div className="flex justify-center px-8 py-24">
      <div className="w-full max-w-form">
        <Panel label="Request Access" tag="///" padding="lg">
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
              autoComplete="current-password"
              required
              placeholder="Password"
              hint="Minimum 8 characters"
            />

            <Button type="submit" variant="signal" size="md" fullWidth>
              Request Access
            </Button>
          </form>
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
