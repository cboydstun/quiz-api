import type { Role } from "@quiz/db";
import type { GraphQLContext } from "../context";
import { forbidden, unauthenticated, MISSING_AUTH_HEADER } from "../errors";
import type { TokenPayload } from "./jwt";

export const USER_ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];
export const QUESTION_EDITOR_ROLES: Role[] = ["EDITOR", "ADMIN", "SUPER_ADMIN"];

/**
 * Single place a resolver turns "maybe authenticated" into "definitely
 * authenticated". Every guarded resolver starts with this; none of them read
 * `context.viewer` directly.
 */
export function requireAuth(context: GraphQLContext): TokenPayload {
  if (context.viewer) return context.viewer;
  throw context.viewerError ?? unauthenticated(MISSING_AUTH_HEADER);
}

export function requireRole(
  context: GraphQLContext,
  allowed: Role[],
): TokenPayload {
  const viewer = requireAuth(context);
  if (!allowed.includes(viewer.role)) {
    throw forbidden(`this action requires one of: ${allowed.join(", ")}`);
  }
  return viewer;
}

/** Self, or an admin acting on someone else. */
export function requireSelfOrAdmin(
  context: GraphQLContext,
  targetUserId: string,
): TokenPayload {
  const viewer = requireAuth(context);
  if (viewer._id === targetUserId) return viewer;
  return requireRole(context, USER_ADMIN_ROLES);
}
