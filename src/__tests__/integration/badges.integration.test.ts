import { ApolloServer, ExpressContext } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import typeDefs from "../../schema";
import { resolvers } from "../../resolvers";
import User from "../../models/User";
import Badge from "../../models/Badge";
import { generateToken } from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const CREATE_BADGE = `
  mutation CreateBadge($name: String!, $description: String!, $imageUrl: String!) {
    createBadge(name: $name, description: $description, imageUrl: $imageUrl) {
      id
      name
      description
      imageUrl
    }
  }
`;

const GET_BADGES = `
  query GetBadges {
    badges {
      id
      name
      description
      imageUrl
    }
  }
`;

const ISSUE_BADGE_TO_USER = `
  mutation IssueBadgeToUser($badgeId: ID!, $userId: ID!) {
    issueBadgeToUser(badgeId: $badgeId, userId: $userId) {
      id
      badges {
        id
        name
        description
        imageUrl
        earnedAt
      }
    }
  }
`;

// Helper function to create a mock context
const createMockContext = (user: any): ExpressContext => {
  const token = generateToken(user);
  return {
    req: {
      headers: {
        authorization: `Bearer ${token}`,
      },
      get: (name: string) => name === 'authorization' ? `Bearer ${token}` : undefined,
      header: (name: string) => name === 'authorization' ? `Bearer ${token}` : undefined,
      accepts: () => false,
      acceptsCharsets: () => false,
      acceptsEncodings: () => false,
      acceptsLanguages: () => false,
      range: () => undefined,
    } as unknown as Request,
    res: {} as Response,
  };
};

describe("Badge Operations Integration Tests", () => {
  let server: ApolloServer;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set JWT secret for testing
    process.env.JWT_SECRET = "test-secret";

    server = new ApolloServer({
      typeDefs,
      resolvers: resolvers as any, // Type assertion to bypass strict type checking
      context: ({ req, res }: ExpressContext) => ({ req, res }),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Badge.deleteMany({});

    // Create an admin user
    adminUser = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "adminpass",
      role: "ADMIN",
    });

    // Create a regular user
    regularUser = await User.create({
      username: "user",
      email: "user@example.com",
      password: "userpass",
      role: "USER",
    });
  });

  it("should create a new badge when requested by an admin", async () => {
    const badgeData = {
      name: "Test Badge",
      description: "This is a test badge",
      imageUrl: "https://example.com/badge.png",
    };

    const res = await server.executeOperation(
      {
        query: CREATE_BADGE,
        variables: badgeData,
      },
      createMockContext(adminUser)
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.createBadge).toMatchObject(badgeData);
    expect(res.data?.createBadge.id).toBeDefined();
  });

  it("should query all badges", async () => {
    // Create some test badges
    await Badge.create({
      name: "Badge 1",
      description: "Description 1",
      imageUrl: "https://example.com/badge1.png",
    });
    await Badge.create({
      name: "Badge 2",
      description: "Description 2",
      imageUrl: "https://example.com/badge2.png",
    });

    const res = await server.executeOperation(
      {
        query: GET_BADGES,
      },
      createMockContext(adminUser)
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.badges).toHaveLength(2);
    expect(res.data?.badges[0]).toHaveProperty("id");
    expect(res.data?.badges[0]).toHaveProperty("name");
    expect(res.data?.badges[0]).toHaveProperty("description");
    expect(res.data?.badges[0]).toHaveProperty("imageUrl");
  });

  it("should issue a badge to a user", async () => {
    const badge = await Badge.create({
      name: "Achievement Badge",
      description: "Awarded for an achievement",
      imageUrl: "https://example.com/achievement.png",
    });

    const res = await server.executeOperation(
      {
        query: ISSUE_BADGE_TO_USER,
        variables: { badgeId: badge.id, userId: regularUser.id },
      },
      createMockContext(adminUser)
    );

    expect(res.errors).toBeUndefined();
    expect(res.data?.issueBadgeToUser.id).toBe(regularUser.id);
    expect(res.data?.issueBadgeToUser.badges).toHaveLength(1);
    expect(res.data?.issueBadgeToUser.badges[0].id).toBeDefined();
    expect(res.data?.issueBadgeToUser.badges[0].name).toBe(badge.name);
    expect(res.data?.issueBadgeToUser.badges[0].description).toBe(badge.description);
    expect(res.data?.issueBadgeToUser.badges[0].imageUrl).toBe(badge.imageUrl);
    expect(res.data?.issueBadgeToUser.badges[0].earnedAt).toBeDefined();
  });
});
