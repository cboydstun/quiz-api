// src/resolvers/authResolvers.ts

import User from "../models/User";
import { generateToken } from "../utils/auth";
import { AuthenticationError, UserInputError } from "../utils/errors";
import { ApolloError } from "apollo-server-express";
import { AuthResolvers } from "./types";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";
import { registerUserSchema, loginUserSchema } from "../utils/validationSchemas";
import { ValidationError } from "yup";
import { logger } from "../utils/logger";

dotenv.config();

// Export the client creation function for easier mocking
export const createOAuth2Client = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

// Use the function to create the client
export const client = createOAuth2Client();

const authResolvers: AuthResolvers = {
  Query: {
    getGoogleAuthUrl: async () => {
      try {
        const url = await client.generateAuthUrl({
          access_type: "offline",
          scope: ["profile", "email"],
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        });
        if (!url) {
          throw new Error("Failed to generate Google Auth URL");
        }
        return { url };
      } catch (error) {
        throw new ApolloError(
          "Failed to generate Google Auth URL",
          "GOOGLE_AUTH_ERROR"
        );
      }
    },
  },
  Mutation: {
    register: async (_, { input }) => {
      try {
        // Validate input using the registerUserSchema
        const validatedInput = await registerUserSchema.validate(input, { abortEarly: false });

        const existingUser = await User.findOne({
          $or: [{ email: validatedInput.email }, { username: validatedInput.username }],
        });
        if (existingUser) {
          throw new UserInputError("Username or email already exists");
        }

        const user = new User({
          username: validatedInput.username,
          email: validatedInput.email,
          password: validatedInput.password,
          role: validatedInput.role,
        });
        await user.save();

        const token = generateToken(user);
        logger.info(`User registered successfully: ${user.username}`);
        return { token, user };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new UserInputError(`Invalid input: ${error.errors.join(", ")}`);
        }
        logger.error(`Registration error: ${(error as Error).message}`, { error });
        throw error;
      }
    },

    login: async (_, { email, password }) => {
      try {
        // Validate input using the loginUserSchema
        const validatedInput = await loginUserSchema.validate({ email, password }, { abortEarly: false });

        const user = await User.findOne({ email: validatedInput.email });
        if (!user) {
          throw new AuthenticationError("Invalid credentials");
        }

        const isValid = await user.comparePassword(validatedInput.password);
        if (!isValid) {
          throw new AuthenticationError("Invalid credentials");
        }

        const token = generateToken(user);
        logger.info(`User logged in successfully: ${user.username}`);
        return { token, user };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new UserInputError(`Invalid input: ${error.errors.join(", ")}`);
        }
        logger.error(`Login error: ${(error as Error).message}`, { error });
        throw error;
      }
    },
    authenticateWithGoogle: async (_, { code }) => {
      try {
        const { tokens } = await client.getToken(code);

        if (!tokens.id_token) {
          throw new AuthenticationError("No ID token returned from Google");
        }

        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          console.error("Invalid Google token: No payload");
          throw new AuthenticationError("Invalid Google token");
        }

        let user = await User.findOne({
          $or: [{ googleId: payload.sub }, { email: payload.email }],
        });

        if (!user) {
          user = new User({
            googleId: payload.sub,
            email: payload.email,
            username: payload.name,
            role: "USER",
          });
          await user.save();
        } else {
          // If the user exists but doesn't have a googleId, update it
          if (!user.googleId) {
            user.googleId = payload.sub;
            await user.save();
          }
        }

        const token = generateToken(user);

        return { token, user };
      } catch (error) {
        throw new AuthenticationError(
          `Failed to authenticate with Google: ${error}`
        );
      }
    },
  },
};

export default authResolvers;
