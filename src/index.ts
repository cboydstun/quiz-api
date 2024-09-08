import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import typeDefs from './schema';
import resolvers from './resolvers';
import { logger, expressLogger } from './utils/logger';

dotenv.config();

const startServer = async () => {
  const app = express();

  // Enable CORS for all origins
  app.use(cors({
    origin: '*',
    credentials: true
  }));

  // Use the express logger middleware
  app.use(expressLogger);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    formatError: (error) => {
      logger.error('GraphQL Error', { error: error.message, path: error.path });
      return error;
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
};

startServer().catch((error) => logger.error('Failed to start the server', { error }));