// config/session.ts

import session from 'express-session';
import * as dotenv from "dotenv";

dotenv.config();

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not defined in the environment variables');
}

export const sessionConfig = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
});