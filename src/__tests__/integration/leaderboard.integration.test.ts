// src/__tests__/integration/leaderboard.integration.test.ts

import { ApolloServer, AuthenticationError } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User, { IUser } from "../../models/User";
import { generateToken } from "../../utils/auth";
import * as authUtils from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const GET_LEADERBOARD = `
  query GetLeaderboard($limit: Int) {
    getLeaderboard(limit: $limit) {
      leaderboard {
        position
        user {
          username
          email
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          username
          email
          score
        }
        score
      }
    }
  }
`;

const createMockContext = (user: IUser): ExpressContext => {
  const token = generateToken({
    _id: user._id.toString(),
    email: user.email,
    role: user.role,
    score: user.score,
    username: user.username
  });
  return {
    req: {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request,
    res: {} as Response,
  };
};

describe("Leaderboard Integration Tests", () => {
  let server: ApolloServer<ExpressContext>;
  let users: IUser[];

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    process.env.JWT_SECRET = "test-secret";

    server = new ApolloServer<ExpressContext>({
      typeDefs,
      resolvers,
      context: ({ req, res }) => ({ req, res }),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    users = await User.create([
      { email: "user1@example.com", username: "user1", password: "password", role: "USER", score: 100 },
      { email: "user2@example.com", username: "user2", password: "password", role: "USER", score: 200 },
      { email: "user3@example.com", username: "user3", password: "password", role: "USER", score: 150 },
      { email: "user4@example.com", username: "user4", password: "password", role: "USER", score: 50 },
      { email: "user5@example.com", username: "user5", password: "password", role: "USER", score: 75 },
    ]);
  });

  it("should return the correct leaderboard", async () => {
    const currentUser = users.find(user => user.email === "user3@example.com");
    if (!currentUser) {
      throw new Error("Test user not found");
    }
  
    // Mock checkAuth to return a DecodedUser object
    jest.spyOn(authUtils, 'checkAuth').mockImplementation(() => ({
      _id: currentUser._id.toString(),
      email: currentUser.email,
      role: currentUser.role,
      score: currentUser.score,
      username: currentUser.username
    }));
  
    const context = createMockContext(currentUser);
  
    const result = await server.executeOperation(
      {
        query: GET_LEADERBOARD,
        variables: { limit: 5 },
      },
      context
    );
  
    expect(result.errors).toBeUndefined();
    expect(result.data?.getLeaderboard.leaderboard).toHaveLength(5);
    expect(result.data?.getLeaderboard.leaderboard[0].position).toBe(1);
    expect(result.data?.getLeaderboard.leaderboard[0].user.email).toBe("user2@example.com");
    expect(result.data?.getLeaderboard.leaderboard[0].user.username).toBe("user2");
    expect(result.data?.getLeaderboard.leaderboard[0].score).toBe(200);
    expect(result.data?.getLeaderboard.currentUserEntry.position).toBe(2);  // Changed from 3 to 2
    expect(result.data?.getLeaderboard.currentUserEntry.user.email).toBe("user3@example.com");
    expect(result.data?.getLeaderboard.currentUserEntry.user.username).toBe("user3");
    expect(result.data?.getLeaderboard.currentUserEntry.score).toBe(150);
  });

  it("should limit the leaderboard results", async () => {
    const currentUser = await User.findOne({ username: "user1" });
    if (!currentUser) {
      throw new Error("Test user not found");
    }
    const context = createMockContext(currentUser);

    const result = await server.executeOperation(
      {
        query: GET_LEADERBOARD,
        variables: { limit: 3 },
      },
      context
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.getLeaderboard.leaderboard).toHaveLength(3);
  });

it("should handle a user not in the top ranks", async () => {
  const currentUser = users.find(user => user.email === "user4@example.com");
  if (!currentUser) {
    throw new Error("Test user not found");
  }

  // Mock checkAuth to return a DecodedUser object
  jest.spyOn(authUtils, 'checkAuth').mockImplementation(() => ({
    _id: currentUser._id.toString(),
    email: currentUser.email,
    role: currentUser.role,
    score: currentUser.score,
    username: currentUser.username
  }));

  const context = createMockContext(currentUser);

  const result = await server.executeOperation(
    {
      query: GET_LEADERBOARD,
      variables: { limit: 3 },
    },
    context
  );

  expect(result.errors).toBeUndefined();
  expect(result.data?.getLeaderboard.leaderboard).toHaveLength(3);
  expect(result.data?.getLeaderboard.currentUserEntry).not.toBeNull();
  expect(result.data?.getLeaderboard.currentUserEntry.position).toBe(5);
  expect(result.data?.getLeaderboard.currentUserEntry.user.username).toBe("user4");
  
  // Check that the current user is not in the top 3
  const topUsernames = result.data?.getLeaderboard.leaderboard.map((entry: { user: { username: string } }) => entry.user.username);
  expect(topUsernames).not.toContain("user4");
});

it("should handle an unauthenticated user", async () => {
    // Mock checkAuth to throw an AuthenticationError
    jest.spyOn(authUtils, 'checkAuth').mockImplementation(() => {
      throw new AuthenticationError("Not authenticated");
    });
  
    const context = { req: { headers: {} }, res: {} };
  
    const result = await server.executeOperation(
      {
        query: GET_LEADERBOARD,
        variables: { limit: 5 },
      },
      context as any
    );
  
    expect(result.errors).toBeUndefined();
    expect(result.data?.getLeaderboard.leaderboard).toBeDefined();
    expect(result.data?.getLeaderboard.leaderboard.length).toBeGreaterThan(0);
    expect(result.data?.getLeaderboard.currentUserEntry).toBeNull();
  });

  it("should handle a user with no score", async () => {
    const noScoreUser = await User.create({
      email: "noscore@example.com",
      username: "noscore",
      password: "password",
      role: "USER",
      score: null,
    });
  
    // Mock checkAuth to return the no-score user
    jest.spyOn(authUtils, 'checkAuth').mockImplementation(() => ({
      _id: noScoreUser._id.toString(),
      email: noScoreUser.email,
      role: noScoreUser.role,
      score: noScoreUser.score,
      username: noScoreUser.username
    }));
  
    const context = createMockContext(noScoreUser);
  
    const result = await server.executeOperation(
      {
        query: GET_LEADERBOARD,
        variables: { limit: 5 },
      },
      context
    );
  
    expect(result.errors).toBeUndefined();
    expect(result.data?.getLeaderboard.leaderboard).toHaveLength(5);
    expect(result.data?.getLeaderboard.currentUserEntry).toBeNull();
  });
});