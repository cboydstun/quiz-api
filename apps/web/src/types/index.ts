// src/types/index.ts
//
// Shared domain types. These mirror the backend GraphQL schema by hand — there
// is no codegen in this repo, so when a query's selection set changes, update
// the matching type here (or the operation-result type next to the gql tag).

export type Role = "USER" | "EDITOR" | "ADMIN" | "SUPER_ADMIN";

export const ROLES: Role[] = ["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"];

/** Roles allowed into /management at all. */
export const MANAGEMENT_ROLES: Role[] = ["EDITOR", "ADMIN", "SUPER_ADMIN"];

/** Roles allowed to manage other users. */
export const USER_ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export const isRole = (value: string): value is Role =>
  (ROLES as string[]).includes(value);

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  /**
   * Optional because not every `me` selection asks for it — the navbar does,
   * to show the streak; the quiz page has no use for it.
   */
  consecutiveLoginDays?: number;
}

export type NewUser = Omit<User, "id"> & { password: string };

export interface Question {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  /** Offered before answering, so it must not give the answer away. */
  hint?: string;
  /** Shown after grading and on the public practice pages. */
  explanation?: string | null;
  points: number;
  /** Part 107 subject area. Null until an editor classifies the question. */
  domain?: string | null;
  createdBy: {
    id: string;
    username: string;
  };
}

/**
 * The narrower question shape the quiz page selects — no correctAnswer (the
 * backend grades server-side via submitAnswer) and no createdBy.
 */
export interface QuizQuestion {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  hint?: string;
  points: number;
}
