// src/index.ts

import express from "express";
import { ApolloServer } from "apollo-server-express";
import mongoose from "mongoose";
import cors from "cors";
import * as dotenv from "dotenv";
import typeDefs from "./schema";
import resolvers from "./resolvers";
import { logger, expressLogger } from "./utils/logger";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { GraphQLError } from "graphql";

dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(helmet());

// Custom CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://yourdomain.com"]
    : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(expressLogger);

const startServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
    context: ({ req }) => ({ req }),
    formatError: (error) => {
      logger.error("GraphQL Error", { error: error.message, path: error.path });

      if (process.env.NODE_ENV !== "production") {
        return error;
      }

      return new GraphQLError(
        "An error occurred while processing your request."
      );
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql", cors: false });

  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error });
    process.exit(1); // Exit process on MongoDB connection failure
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(
      `Server is running on http://localhost:${PORT}${server.graphqlPath}`
    );
  });
};

startServer().catch((error) => {
  logger.error("Failed to start the server", { error });
  process.exit(1); // Exit process on critical server startup error
});
