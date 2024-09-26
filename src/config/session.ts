// config/session.ts

import session from 'express-session';
import * as dotenv from "dotenv";

dotenv.config();

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
});
