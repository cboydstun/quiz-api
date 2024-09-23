import express from "express";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import * as dotenv from "dotenv";
import passport from './utils/passport';
import typeDefs from "./schema";
import resolvers from "./resolvers";
import { logger, expressLogger } from "./utils/logger";
import helmet from "helmet";
import { GraphQLError } from "graphql";
import { connectDB } from "./config/database";
import { sessionConfig } from "./config/session";
import { limiter } from "./config/rateLimiter";
import { initializePassport } from './config/passport';
import { corsOptions } from "./config/cors";

dotenv.config();

const app = express();

app.use(limiter);
app.use(cors(corsOptions));
app.use(helmet());
app.use(sessionConfig);
initializePassport(app);

const startServer = async () => {
  // Enable CORS for all origins
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );

  // Use the express logger middleware
  app.use(expressLogger);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
    context: ({ req }) => ({ req }),
    formatError: (error) => {
      logger.error("GraphQL Error", { error: error.message, path: error.path });
      return new GraphQLError(
        "An error occurred while processing your request.",
        {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        } as any
      );
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql", cors: false });

  await connectDB();

  // Add Google OAuth routes
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect home.
      res.redirect('/');
    });

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