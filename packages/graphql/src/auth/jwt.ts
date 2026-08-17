import jwt from "jsonwebtoken";
import type { Role, UserRow } from "@quiz/db";
import { invalidToken } from "../errors";

/**
 * Claim names are inherited from the previous backend on purpose: `_id` rather
 * than `sub`. Tokens already sitting in users' localStorage stay valid across
 * the cutover as long as JWT_SECRET is carried over too.
 */
export interface TokenPayload {
  _id: string;
  email: string;
  role: Role;
  username: string | null;
  score: number;
}

/**
 * Thirty days, up from one.
 *
 * There is no refresh mechanism: when the token expires the user is simply
 * signed out. At a day, that meant a study tool built around a daily streak
 * demanded a fresh sign-in before every streak day — the two features were
 * working against each other. The trade is a longer window in which a stolen
 * token is usable, which is bounded by the token living in localStorage on the
 * user's own device and carrying no privileges beyond that user's own record.
 */
const EXPIRES_IN = "30d";
const ALGORITHM = "HS256" as const;

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not set");
  }
  return value;
}

export function signToken(user: UserRow): string {
  const payload: TokenPayload = {
    _id: user.id,
    email: user.email,
    role: user.role,
    username: user.username,
    score: user.score,
  };
  return jwt.sign(payload, secret(), {
    expiresIn: EXPIRES_IN,
    algorithm: ALGORITHM,
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    // Allow-list the algorithm: without it a token claiming `alg: none`
    // or an asymmetric algorithm could be accepted.
    return jwt.verify(token, secret(), {
      algorithms: [ALGORITHM],
    }) as TokenPayload;
  } catch {
    // Deliberately marked as unauthenticated (the old backend said only
    // "Invalid/Expired token", which the client did not recognise, so an
    // expired token left the user stuck in a broken half-logged-in state).
    throw invalidToken("Invalid/Expired token");
  }
}
