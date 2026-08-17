"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { formatDate } from "@/lib/format";
import { messageFrom } from "@/lib/errors";
import type { Role } from "@/types";
import {
  Alert,
  Button,
  Label,
  Readout,
  Rule,
  Spinner,
  Status,
  TextField,
} from "@/components/ds";

const GET_USER_PROFILE: TypedDocumentNode<GetUserProfileResult> = gql`
  query GetUserProfile {
    me {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      skills
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
      domainAccuracy {
        domain
        answered
        correct
        accuracy
      }
    }
  }
`;

const UPDATE_USERNAME: TypedDocumentNode<
  UpdateUsernameResult,
  UpdateUsernameVars
> = gql`
  mutation UpdateUsername($username: String!) {
    updateUsername(username: $username) {
      id
      username
    }
  }
`;

const UPDATE_PASSWORD: TypedDocumentNode<
  UpdatePasswordResult,
  UpdatePasswordVars
> = gql`
  mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
    updatePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      success
      message
    }
  }
`;

const UPDATE_LOGIN_STREAK: TypedDocumentNode<
  UpdateLoginStreakResult,
  UpdateLoginStreakVars
> = gql`
  mutation UpdateLoginStreak($userId: ID!) {
    updateLoginStreak(userId: $userId) {
      id
      consecutiveLoginDays
      lastLoginDate
    }
  }
`;

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  score: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  skills: string[] | null;
  lifetimePoints: number;
  yearlyPoints: number;
  monthlyPoints: number;
  dailyPoints: number;
  consecutiveLoginDays: number | null;
  lastLoginDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  domainAccuracy: DomainAccuracy[];
}

interface DomainAccuracy {
  domain: string;
  answered: number;
  correct: number;
  accuracy: number;
}

interface GetUserProfileResult {
  me: ProfileUser | null;
}

interface UpdateUsernameResult {
  updateUsername: { id: string; username: string } | null;
}
interface UpdateUsernameVars {
  username: string;
}

interface UpdatePasswordResult {
  updatePassword: { success: boolean; message: string } | null;
}
interface UpdatePasswordVars {
  currentPassword: string;
  newPassword: string;
}

interface UpdateLoginStreakResult {
  updateLoginStreak: {
    id: string;
    consecutiveLoginDays: number;
    lastLoginDate: string;
  } | null;
}
interface UpdateLoginStreakVars {
  userId: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const { loading, error, data, refetch } = useQuery(GET_USER_PROFILE);
  const [updateUsername] = useMutation(UPDATE_USERNAME);
  const [updatePassword] = useMutation(UPDATE_PASSWORD);
  const [updateLoginStreak] = useMutation(UPDATE_LOGIN_STREAK);

  // Both mutations select `id`, so Apollo merges the returned fields into the
  // normalized User entity that `me` already points at — no manual cache.modify
  // needed. (The previous hand-rolled version spread an Apollo Reference.)
  const streakRecordedForRef = useRef<string | null>(null);
  const profileUser = data?.me ?? null;

  // There is no middleware and no guard component: every protected page owns
  // its own redirect, the same way /quiz does. Without this one, a logged-out
  // visitor stayed here and read the raw "Authorization header must be
  // provided" off the wire — that message carries neither marker the Apollo
  // error link watches for, so nothing else moved them along.
  useEffect(() => {
    if (!loading && !profileUser) {
      router.push("/login");
    }
  }, [loading, profileUser, router]);

  useEffect(() => {
    const userId = profileUser?.id;
    if (!userId || streakRecordedForRef.current === userId) return;
    streakRecordedForRef.current = userId;
    updateLoginStreak({ variables: { userId } }).catch((err) => {
      console.error("Error updating login streak:", err);
    });
  }, [profileUser?.id, updateLoginStreak]);

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateUsername({ variables: { username } });
      const updated = result.data?.updateUsername;
      if (!updated) {
        // errorPolicy "all" resolves rather than throws, so "Username is
        // already taken" arrives here and never reached the catch below.
        setMessage(messageFrom(result.error, "Failed to update username"));
        return;
      }
      setMessage(`Username updated successfully: ${updated.username}`);
      setUsername("");
      refetch();
    } catch (err) {
      setMessage(messageFrom(err, "Failed to update username"));
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }
    try {
      const result = await updatePassword({
        variables: { currentPassword, newPassword },
      });
      setMessage(
        result.data?.updatePassword?.message ??
          messageFrom(result.error, "Failed to update password"),
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(messageFrom(err, "Failed to update password"));
    }
  };

  if (loading) return <Spinner label="Loading record" />;

  // The effect above is already pushing to /login.
  if (!profileUser) return null;

  const accuracy =
    profileUser && profileUser.questionsAnswered > 0
      ? Math.round(
          (profileUser.questionsCorrect / profileUser.questionsAnswered) * 1000,
        ) / 10
      : null;

  const domains = profileUser?.domainAccuracy ?? [];
  const badges = profileUser?.skills?.filter(Boolean) ?? [];

  // Full class strings, not interpolated: Tailwind only emits classes it can
  // see literally in the source, so `bg-${tone}` would generate nothing.
  const BAR = {
    go: { text: "text-go", bar: "bg-go" },
    caution: { text: "text-caution", bar: "bg-caution" },
    abort: { text: "text-abort", bar: "bg-abort" },
  } as const;

  const toneFor = (value: number): keyof typeof BAR =>
    value >= 80 ? "go" : value >= 60 ? "caution" : "abort";

  return (
    <div className="mx-auto max-w-wide px-4 sm:px-8 py-16">
      <Label tag="///" className="mb-6">
        Operator Record
      </Label>
      <h1 className="m-0 mb-10 text-2xl font-medium tracking-tight text-bone-100">
        {profileUser?.username ?? "Operator"}
      </h1>

      {error && (
        <div className="mb-8">
          <Alert tone="caution" kicker="PARTIAL">
            {error.message}
          </Alert>
        </div>
      )}

      {message && (
        <div className="mb-8">
          <Alert
            tone={/fail|not match/i.test(message) ? "abort" : "go"}
            onDismiss={() => setMessage("")}
          >
            {message}
          </Alert>
        </div>
      )}

      {profileUser && (
        <div className="mb-8 grid grid-cols-2 gap-px border border-line-hairline bg-line-hairline lg:grid-cols-4">
          <div className="bg-ink-800">
            <Readout
              label="Lifetime"
              value={profileUser.score.toLocaleString()}
              unit="pts"
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Answered"
              value={profileUser.questionsAnswered.toLocaleString()}
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Accuracy"
              value={accuracy === null ? "\u2014" : accuracy}
              unit={accuracy === null ? undefined : "%"}
              tone={accuracy === null ? "muted" : toneFor(accuracy)}
            />
          </div>
          <div className="bg-ink-800">
            <Readout
              label="Streak"
              value={profileUser.consecutiveLoginDays ?? 0}
              unit="days"
              tone="signal"
            />
          </div>
        </div>
      )}

      <div className="grid gap-px border border-line-hairline bg-line-hairline lg:grid-cols-[1.2fr_1fr]">
        <div className="bg-ink-800 p-8">
          <Label className="mb-6">Accuracy by Domain</Label>

          {domains.length === 0 ? (
            <p className="m-0 max-w-[46ch] text-sm leading-normal text-mute-500">
              No classified answers yet. Questions carry a domain only once an
              editor assigns one, so a run against unclassified items does not
              appear here.
            </p>
          ) : (
            /*
              Each bar is a link into a run narrowed to that domain. Reading
              "Weather sources 40%" and being offered no way to act on it is
              the difference between a diagnosis and a report.
            */
            <div className="flex flex-col gap-4">
              {domains.map((d) => (
                <Link
                  key={d.domain}
                  href={`/quiz?domain=${encodeURIComponent(d.domain)}`}
                  className="group block transition-fast focus-signal"
                >
                  <div className="mb-2 flex justify-between gap-4">
                    <span className="text-sm text-mute-400 group-hover:text-bone-100">
                      {d.domain}
                    </span>
                    <span className="font-mono text-3xs tracking-mono text-mute-500">
                      <span className={BAR[toneFor(d.accuracy)].text}>
                        {d.accuracy}%
                      </span>
                      {" \u00b7 "}
                      {d.correct}/{d.answered}
                    </span>
                  </div>
                  <div className="h-0.5 bg-ink-950">
                    <div
                      className={`h-0.5 ${BAR[toneFor(d.accuracy)].bar}`}
                      style={{ width: `${d.accuracy}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {badges.length > 0 && (
            <>
              <Rule className="my-6" />
              <Label className="mb-4">Badges</Label>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Status key={badge} tone="info" dot={false}>
                    {badge}
                  </Status>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-ink-800 p-8">
          <Label className="mb-6">Account</Label>

          <form onSubmit={handleUsernameUpdate}>
            <TextField
              id="username"
              label="New Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button type="submit" variant="outline" size="sm" fullWidth>
              Update Username
            </Button>
          </form>

          <Rule className="my-6" />

          <form onSubmit={handlePasswordUpdate}>
            <TextField
              id="currentPassword"
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextField
              id="newPassword"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Minimum 8 characters"
            />
            <TextField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword !== "" && confirmPassword !== newPassword}
            />
            <Button type="submit" variant="outline" size="sm" fullWidth>
              Update Password
            </Button>
          </form>

          <Rule className="my-6" />

          <div className="flex flex-col gap-3">
            <div className="flex justify-between gap-4">
              <Label>Email</Label>
              <span className="font-mono text-3xs text-mute-400">
                {profileUser?.email}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <Label>Role</Label>
              <span className="font-mono text-3xs text-mute-400">
                {profileUser?.role.replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <Label>Created</Label>
              <span className="font-mono text-3xs text-mute-400">
                {formatDate(profileUser?.createdAt)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <Label>Last Login</Label>
              <span className="font-mono text-3xs text-mute-400">
                {formatDate(profileUser?.lastLoginDate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
