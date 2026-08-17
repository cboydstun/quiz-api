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
  /**
   * Who to count rate-limited requests against. Vercel sets x-forwarded-for
   * and it is the only caller identity an unauthenticated request has; the
   * literal "unknown" bucket is shared, which is the conservative direction
   * for a header a client controls.
   */
  clientId: string;
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

/**
 * x-forwarded-for is a comma-separated chain; the first entry is the original
 * client. Vercel appends the true peer, but reading the leftmost value matches
 * what every other consumer of this header expects.
 */
function clientIdOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

export function buildContext(
  request: Request,
  options: ContextOptions = {},
): GraphQLContext {
  const db = options.db ?? getDb();
  const clientId = clientIdOf(request);

  // The client sends `authorization: ""` (not an absent header) when logged
  // out, so an empty value has to be treated as "missing".
  const header = request.headers.get("authorization");
  if (!header) {
    return {
      db,
      clientId,
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
      clientId,
      viewer: null,
      viewerError: unauthenticated(MALFORMED_AUTH_HEADER),
    };
  }

  try {
    return { db, clientId, viewer: verifyToken(token), viewerError: null };
  } catch (error) {
    return { db, clientId, viewer: null, viewerError: error as GraphQLError };
  }
}
