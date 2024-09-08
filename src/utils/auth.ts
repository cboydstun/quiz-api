// src/utils/auth.ts

import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errors';
import { IUser } from '../models/User';

export interface DecodedUser {
  _id: string;
  email: string;
  role: string;
}

export const generateToken = (user: DecodedUser): string => {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  );
};

export const checkAuth = (context: any): DecodedUser => {
  const authHeader = context.req.headers.authorization;
  if (!authHeader) {
    throw new AuthenticationError('Authorization header must be provided');
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    throw new AuthenticationError('Authentication token must be "Bearer [token]"');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedUser;
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid/Expired token');
  }
};