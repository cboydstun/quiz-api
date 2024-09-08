// src/utils/auth.ts

import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errors';
import { IUser } from '../models/User';

export const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );
};

export const checkAuth = async (context: any): Promise<IUser> => {
  const authHeader = context.req.headers.authorization;
  if (!authHeader) {
    throw new AuthenticationError('Authorization header must be provided');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new AuthenticationError('Authentication token must be "Bearer [token]"');
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!) as IUser;
    return user;
  } catch (error) {
    throw new AuthenticationError('Invalid/Expired token');
  }
};