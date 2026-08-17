import { CombinedGraphQLErrors } from "@apollo/client";

/**
 * Pulls the server's own wording out of a failed operation.
 *
 * This exists because `errorPolicy: "all"` changes how mutations fail: they
 * *resolve* with `{ data: null, error }` instead of rejecting, so a `catch`
 * block never runs for a GraphQL error and every call site that relied on one
 * fell through to its generic fallback. That is how "Username or email already
 * exists" and "Password must be at least 8 characters long" — messages the
 * backend goes to the trouble of writing — reached the user as "Registration
 * failed. Please try again."
 *
 * Pass the `error` off the mutation result, not just whatever `catch` caught.
 */
export function messageFrom(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error) && error.errors.length > 0) {
    return error.errors[0]?.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
