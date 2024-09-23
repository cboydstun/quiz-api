// config/session.ts
import session from 'express-session';

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
});
