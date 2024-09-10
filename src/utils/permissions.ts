// src/utils/permissions.ts

import { ForbiddenError } from "./errors";
import { DecodedUser } from "./auth";

export const checkPermission = (
  user: DecodedUser,
  allowedRoles: string[]
): void => {
  if (!user || !user.role) {
    throw new ForbiddenError("Not authenticated");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      "You do not have permission to perform this action"
    );
  }
};
