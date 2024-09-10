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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(helmet());

const startServer = async () => {
  const app = express();

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

  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error });
  }

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