"use client";

import React, { useState, useEffect, useRef } from "react";
import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { formatDate } from "@/lib/format";
import type { Role } from "@/types";

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
        setMessage("Failed to update username");
        return;
      }
      setMessage(`Username updated successfully: ${updated.username}`);
      setUsername("");
      refetch();
    } catch (err) {
      setMessage("Failed to update username");
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
        result.data?.updatePassword?.message ?? "Failed to update password",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage("Failed to update password");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-center text-xl text-red-500">
            Error: {error.message}
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
          Profile Management
        </h1>

        {message && (
          <div
            className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-8 rounded-lg transition-all duration-300 transform hover:scale-105"
            role="alert"
          >
            <p>{message}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 transform hover:scale-105">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600">
              Update Profile
            </h2>
            <form onSubmit={handleUsernameUpdate} className="mb-8">
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
              >
                Update Username
              </button>
            </form>

            <form onSubmit={handlePasswordUpdate}>
              <div className="mb-4">
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300"
              >
                Update Password
              </button>
            </form>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 transform hover:scale-105">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600">
              Your Progress
            </h2>
            {profileUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-blue-600">
                      Total Score
                    </h3>
                    <p className="text-3xl font-bold text-blue-700">
                      {profileUser.score}
                    </p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-green-600">
                      Questions Answered
                    </h3>
                    <p className="text-3xl font-bold text-green-700">
                      {profileUser.questionsAnswered ?? "Data not available"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-purple-600">
                      Correct Answers
                    </h3>
                    <p className="text-3xl font-bold text-purple-700">
                      {profileUser.questionsCorrect}
                    </p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-red-600">
                      Incorrect Answers
                    </h3>
                    <p className="text-3xl font-bold text-red-700">
                      {profileUser.questionsIncorrect}
                    </p>
                  </div>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-yellow-600">
                    Badges
                  </h3>
                  <p className="text-gray-700">
                    {profileUser.skills?.length
                      ? profileUser.skills.join(", ")
                      : "No badges yet"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">
                      Login Streak
                    </h3>
                    <p className="text-3xl font-bold text-indigo-700">
                      {profileUser.consecutiveLoginDays || 0} days
                    </p>
                  </div>
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2 text-pink-600">
                      Last Login
                    </h3>
                    <p className="text-sm text-pink-700">
                      {formatDate(profileUser.lastLoginDate)}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-gray-600">
                    Account Details
                  </h3>
                  <p className="text-sm text-gray-700">
                    Created: {formatDate(profileUser.createdAt)}
                  </p>
                  <p className="text-sm text-gray-700">
                    Last Updated: {formatDate(profileUser.updatedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
