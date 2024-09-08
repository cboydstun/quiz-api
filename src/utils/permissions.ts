// src/utils/permissions.ts

import { ForbiddenError } from './errors';

export const checkPermission = async (context: any, allowedRoles: string[]): Promise<void> => {
  if (!context.user) {
    throw new ForbiddenError('Not authenticated');
  }

  if (!allowedRoles.includes(context.user.role)) {
    throw new ForbiddenError('You do not have permission to perform this action');
  }
};