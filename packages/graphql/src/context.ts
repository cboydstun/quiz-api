import type { GraphQLError } from "graphql";
import { getDb, type Database } from "@quiz/db";
import { verifyToken, type TokenPayload } from "./auth/jwt";
import {
  MALFORMED_AUTH_HEADER,
  MISSING_AUTH_HEADER,
  unauthenticated,
} from "./errors";

export interface GraphQLContext {
  db: Database;
  /** The authenticated caller, or null. */
  viewer: TokenPayload | null;
  /**
   * Why `viewer` is null, kept rather than thrown. `getLeaderboard` is happy to
   * serve anonymous callers, so the context must not reject the request — only
   * the resolvers that actually require a user do, via `requireAuth`.
   */
  viewerError: GraphQLError | null;
}

export interface ContextOptions {
  /** Overridable so tests can hand in a PGlite-backed database. */
  db?: Database;
}

export function buildContext(
  request: Request,
  options: ContextOptions = {},
): GraphQLContext {
  const db = options.db ?? getDb();

  // The client sends `authorization: ""` (not an absent header) when logged
  // out, so an empty value has to be treated as "missing".
  const header = request.headers.get("authorization");
  if (!header) {
    return {
      db,
      viewer: null,
      viewerError: unauthenticated(MISSING_AUTH_HEADER),
    };
  }

  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
  if (!token) {
    return {
      db,
      viewer: null,
      viewerError: unauthenticated(MALFORMED_AUTH_HEADER),
    };
  }

  try {
    return { db, viewer: verifyToken(token), viewerError: null };
  } catch (error) {
    return { db, viewer: null, viewerError: error as GraphQLError };
  }
}
