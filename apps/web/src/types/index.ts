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
}

export type NewUser = Omit<User, "id"> & { password: string };

export interface Question {
  id: string;
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  hint?: string;
  points: number;
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
