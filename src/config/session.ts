// config/session.ts

import session from "express-session";
import MongoStore from "connect-mongo";

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days expiration
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production", // Only use cookies over HTTPS in production
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
});
