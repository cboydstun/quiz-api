// src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import typeDefs from './schema';
import resolvers from './resolvers';
import { errorHandler } from './utils/errors';

dotenv.config();

const startServer = async () => {
  const app = express();
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    formatError: (error) => {
      const formattedError = errorHandler(error);
      return {
        message: formattedError.message,
        extensions: {
          code: formattedError.code,
          http: { status: formattedError.status },
        },
      };
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Connected to MongoDB');

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
};

startServer().catch((error) => console.error('Failed to start the server:', error));