// src/utils/passport.ts

import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import User, { IUser } from "../models/User";
import * as dotenv from "dotenv";

dotenv.config();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
  throw new Error("Missing required Google OAuth environment variables");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleRedirectUri,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            username: profile.displayName,
            role: "USER",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error instanceof Error ? error : new Error("An unknown error occurred"));
      }
    }
  )
);

passport.serializeUser((user: Express.User, done: (err: Error | null, id?: string) => void) => {
  done(null, (user as IUser)._id.toString());
});

passport.deserializeUser(async (id: string, done: (err: Error | null, user?: Express.User | null) => void) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error instanceof Error ? error : new Error("An unknown error occurred"));
  }
});

// Extending Express Request interface directly
interface CustomUser extends IUser { }
declare module 'express' {
  interface Request {
    user?: CustomUser;
  }
}

export default passport;
