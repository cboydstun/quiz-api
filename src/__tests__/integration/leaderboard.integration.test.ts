// src/__tests__/integration/leaderboard.integration.test.ts

import { ApolloServer } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User, { IUser } from "../../models/User";
import { generateToken } from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const GET_LEADERBOARD = `
  query GetLeaderboard($limit: Int) {
    getLeaderboard(limit: $limit) {
      leaderboard {
        position
        user {
          username
          score
        }
        score
      }
      currentUserEntry {
        position
        user {
          username
          score
        }
        score
      }
    }
  }
`;

const createMockContext = (user: IUser): ExpressContext => {
    const token = generateToken(
        {
            _id: user._id,
            email: user.email,
            role: user.role,
            score: user.score,
        }
    );
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
    });

    beforeEach(async () => {
        await User.deleteMany({});

        users = await User.create([
            { username: "user1@example.com", email: "user1@example.com", password: "password", role: "USER", score: 100 },
            { username: "user2@example.com", email: "user2@example.com", password: "password", role: "USER", score: 200 },
            { username: "user3@example.com", email: "user3@example.com", password: "password", role: "USER", score: 150 },
            { username: "user4@example.com", email: "user4@example.com", password: "password", role: "USER", score: 50 },
            { username: "user5@example.com", email: "user5@example.com", password: "password", role: "USER", score: 75 },
        ]);
    });

    it("should return the correct leaderboard", async () => {
        const currentUser = await User.findOne({ username: "user3" });
        if (!currentUser) {
            throw new Error("Test user not found");
        }
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
        expect(result.data?.getLeaderboard.leaderboard[0].user.username).toBe("user2");
        expect(result.data?.getLeaderboard.leaderboard[0].score).toBe(200);
        expect(result.data?.getLeaderboard.currentUserEntry.position).toBe(2);
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
        const currentUser = await User.findOne({ username: "user4" });
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
        expect(result.data?.getLeaderboard.currentUserEntry.position).toBe(5);
        expect(result.data?.getLeaderboard.currentUserEntry.user.username).toBe("user4");
    });

    it("should handle an unauthenticated user", async () => {
        const context = { req: { headers: {} }, res: {} };

        const result = await server.executeOperation(
            {
                query: GET_LEADERBOARD,
                variables: { limit: 5 },
            },
            context as any
        );

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].message).toContain("Not authenticated");
    });

    it("should handle a user with no score", async () => {
        const noScoreUser = await User.create({
            username: "noScoreUser",
            email: "noscore@example.com",
            password: "password",
            role: "USER",
            score: null,
        });

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