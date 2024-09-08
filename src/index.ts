// src/index.ts

import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import typeDefs from './schema';
import resolvers from './resolvers';

dotenv.config();

const startServer = async () => {
  const app = express();

  // Enable CORS for all origins
  app.use(cors({
    origin: '*',
    credentials: true
  }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql', cors: false });

  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Connected to MongoDB');

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
};

startServer().catch((error) => console.error('Failed to start the server:', error));