import { GraphQLError } from "graphql";

/**
 * Error messages are part of the client contract, not just diagnostics.
 *
 * `apps/web/src/components/ApolloWrapper.tsx` clears the stored token and
 * redirects to /login whenever a message contains "unauthorized" or
 * "unauthenticated" (case-insensitively), and
 * `apps/web/src/app/quiz/page.tsx` matches the literal string
 * "Authorization header must be provided".
 *
 * Consequences, both deliberate:
 *   - Authentication failures MUST carry one of those markers so a stale token
 *     gets cleared. Note "Authorization" does not contain "unauthorized", so
 *     the missing-header message is handled by the quiz page's own check.
 *   - Authorization (permission) failures MUST NOT carry them. A USER who
 *     tries an admin action is still logged in; logging them out would be
 *     wrong.
 *
 * Everything here extends GraphQLError so Yoga's `maskedErrors` passes the
 * message through untouched. Anything else becomes "Unexpected error."
 */

export const MISSING_AUTH_HEADER = "Authorization header must be provided";
export const MALFORMED_AUTH_HEADER =
  'Authentication token must be "Bearer [token]"';

function graphqlError(message: string, code: string): GraphQLError {
  // No extensions.http.status: a non-200 response would bypass Apollo's
  // errorPolicy: "all" handling on the client.
  return new GraphQLError(message, { extensions: { code } });
}

export function unauthenticated(message: string): GraphQLError {
  return graphqlError(message, "UNAUTHENTICATED");
}

/** Not logged in / bad token. Prefixed so the client clears the token. */
export function invalidToken(detail: string): GraphQLError {
  return unauthenticated(`Unauthenticated: ${detail}`);
}

/** Logged in, but not allowed. Must not trigger a client-side logout. */
export function forbidden(message: string): GraphQLError {
  return graphqlError(`Forbidden: ${message}`, "FORBIDDEN");
}

export function badInput(message: string): GraphQLError {
  return graphqlError(message, "BAD_USER_INPUT");
}

export function notFound(message: string): GraphQLError {
  return graphqlError(message, "NOT_FOUND");
}

/**
 * Rate limit exceeded. Carefully worded: it must not contain "unauthorized" or
 * "unauthenticated", or a throttled user would be logged out by the client's
 * error link on top of being throttled.
 */
export function tooManyRequests(retryAfterSeconds: number): GraphQLError {
  return graphqlError(
    `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
    "TOO_MANY_REQUESTS",
  );
}
