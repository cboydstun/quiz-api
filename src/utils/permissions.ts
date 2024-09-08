// src/utils/permissions.ts

import { ForbiddenError } from 'apollo-server-express';
import { IUser } from '../models/User';
import { checkAuth } from './auth';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER';

export const checkPermission = async (context: any, allowedRoles: Role[]): Promise<void> => {
  const user = await checkAuth(context);
  if (!allowedRoles.includes(user.role as Role)) {
    throw new ForbiddenError('You do not have permission to perform this action');
  }
};