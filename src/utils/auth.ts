// src/utils/auth.ts

import jwt from "jsonwebtoken";
import { AuthenticationError } from "./errors";

export interface DecodedUser {
  _id: string;
  email: string;
  role: string;
  username?: string;
  score?: number;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }
  return secret;
};

export const generateToken = (user: DecodedUser): string => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      username: user.username, // Include username if it exists
      score: user.score, // Include score if it exists
    },
    getJwtSecret(),
    { expiresIn: "1d" }
  );
};

export const checkAuth = (context: any): DecodedUser => {
  const authHeader = context.req.headers.authorization;
  if (!authHeader) {
    throw new AuthenticationError("Authorization header must be provided");
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    throw new AuthenticationError(
      'Authentication token must be "Bearer [token]"'
    );
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedUser;
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new AuthenticationError("Invalid/Expired token");
  }
};