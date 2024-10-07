// src/index.ts

import express from "express";
import { ApolloServer } from "apollo-server-express";
import { InMemoryLRUCache } from "apollo-server-caching";
import cors from "cors";
import * as dotenv from "dotenv";
import passport from "./utils/passport";
import typeDefs from "./schema";
import resolvers from "./resolvers";
import { logger, expressLogger, errorLogger } from "./utils/logger";
import helmet from "helmet";
import { connectDB } from "./config/database";
import { sessionConfig } from "./config/session";
import { applyRateLimiting } from "./config/rateLimiter";
import { initializePassport } from "./config/passport";
import { corsOptions } from "./config/cors";
import { CustomError, handleCustomError, handleUnexpectedError } from "./utils/errors";

dotenv.config();

const app = express();

// Apply rate limiting
applyRateLimiting(app);

app.use(helmet());
app.use(sessionConfig);
app.use(expressLogger);
app.use(errorLogger);
initializePassport(app);

const startServer = async () => {
  app.use(cors(corsOptions));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    debug: true, // Enables detailed logging of errors
    persistedQueries: {
      cache: new InMemoryLRUCache(), // Use a valid KeyValueCache implementation
    },
    context: ({ req }) => ({ req }),
    formatError: (error) => {
      if (error.originalError instanceof CustomError) {
        return handleCustomError(error.originalError);
      }

      logger.error("GraphQL Error", {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: error.extensions,
      });

      if (error.extensions?.exception?.stacktrace) {
        console.error(error.extensions.exception.stacktrace.join("\n"));
      }

      if (process.env.NODE_ENV === "production") {
        return handleUnexpectedError();
      } else {
        return {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions,
        };
      }
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/v1/graphql", cors: false });

  await connectDB();

  // Add Google OAuth routes
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(
      `Server is running on http://localhost:${PORT}${server.graphqlPath}`
    );
  });
};

startServer().catch((error) =>
  logger.error("Failed to start the server", { error })
);