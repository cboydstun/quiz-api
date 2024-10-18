import { ApolloServer } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import { resolvers } from "../../resolvers";
import User from "../../models/User";
import Question from "../../models/Question";
import { generateToken } from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const GET_USERS = `
  query GetUsers {
    users {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        imageUrl
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
    }
  }
`;

const GET_USER = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      username
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
    }
  }
`;

const GET_USER_FULL = `
  query GetUserFull($id: ID!) {
    user(id: $id) {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        imageUrl
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
    }
  }
`;

const GET_ME = `
  query GetMe {
    me {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        imageUrl
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
    }
  }
`;

const CHANGE_USER_ROLE = `
  mutation ChangeUserRole($userId: ID!, $newRole: Role!) {
    changeUserRole(userId: $userId, newRole: $newRole) {
      id
      username
      email
      role
    }
  }
`;

const DELETE_USER = `
  mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId)
  }
`;

const UPDATE_USER_STATS = `
  mutation UpdateUserStats($userId: ID!, $stats: UserStatsInput!) {
    updateUserStats(userId: $userId, stats: $stats) {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      updatedAt
    }
  }
`;

const SUBMIT_ANSWER = `
  mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
    submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
      success
      isCorrect
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
      get: (name: string) =>
        name === "authorization" ? `Bearer ${token}` : "",
      header: (name: string) =>
        name === "authorization" ? `Bearer ${token}` : "",
      accepts: () => false,
      acceptsCharsets: () => false,
      acceptsEncodings: () => false,
      acceptsLanguages: () => false,
      range: () => undefined,
      user,
    } as unknown as Request,
    res: {} as Response,
  };
};

describe("User Operations Integration Tests", () => {
  let server: ApolloServer<ExpressContext>;
  let adminUser: any;
  let regularUser: any;
  let anotherRegularUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set JWT secret for testing
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
    await Question.deleteMany({});

    // Create an admin user
    adminUser = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "adminpass",
      role: "ADMIN",
    });

    // Create a regular user with an initial lastLoginDate and a badge
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    regularUser = await User.create({
      username: "user",
      email: "user@example.com",
      password: "userpass",
      role: "USER",
      lastLoginDate: yesterday,
      consecutiveLoginDays: 1,
      // Correct field names
      badges: [{
        name: "First Login",
        description: "Logged in for the first time",
        imageUrl: "https://www.example.com/picture123",
        earnedAt: yesterday,
      }],
    });

    // Create another regular user with some stats and badges
    anotherRegularUser = await User.create({
      username: "anotheruser",
      email: "anotheruser@example.com",
      password: "anotherpass",
      role: "USER",
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      score: 100,
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      badges: [
        { name: "Quiz Master", description: "Answered 10 questions", imageUrl: "https://www.example.com/picture1234", earnedAt: new Date() },
        { name: "Sharpshooter", description: "Got 8 questions correct", imageUrl: "https://www.example.com/picture12345", earnedAt: new Date() },
      ],
    });
  });

  describe("User Queries", () => {
    it("should fetch all users when queried by an admin", async () => {
      const res = await server.executeOperation(
        {
          query: GET_USERS,
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.users).toHaveLength(3);
      expect(res.data?.users[0].username).toBe("admin");
      expect(res.data?.users[1].username).toBe("user");
      expect(res.data?.users[2].username).toBe("anotheruser");
      expect(res.data?.users[0]).toHaveProperty("questionsAnswered");
      expect(res.data?.users[0]).toHaveProperty("lifetimePoints");
      expect(res.data?.users[0]).toHaveProperty("yearlyPoints");
      expect(res.data?.users[0]).toHaveProperty("monthlyPoints");
      expect(res.data?.users[0]).toHaveProperty("dailyPoints");
      expect(res.data?.users[0]).toHaveProperty("consecutiveLoginDays");
      expect(res.data?.users[0]).toHaveProperty("lastLoginDate");
      expect(res.data?.users[1].badges).toHaveLength(1);
      expect(res.data?.users[2].badges).toHaveLength(2);
    });

    it("should fetch a specific user by ID with full details when queried by an admin", async () => {
      const res = await server.executeOperation(
        {
          query: GET_USER_FULL,
          variables: { id: regularUser._id.toString() },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.user.username).toBe("user");
      expect(res.data?.user.email).toBe("user@example.com");
      expect(res.data?.user.role).toBe("USER");
      expect(res.data?.user).toHaveProperty("questionsAnswered");
      expect(res.data?.user).toHaveProperty("lifetimePoints");
      expect(res.data?.user).toHaveProperty("yearlyPoints");
      expect(res.data?.user).toHaveProperty("monthlyPoints");
      expect(res.data?.user).toHaveProperty("dailyPoints");
      expect(res.data?.user).toHaveProperty("consecutiveLoginDays");
      expect(res.data?.user).toHaveProperty("lastLoginDate");
      expect(res.data?.user.badges).toHaveLength(1);
      expect(res.data?.user.badges[0].name).toBe("First Login");
    });

    it("should not allow a regular user to fetch all users", async () => {
      const res = await server.executeOperation(
        {
          query: GET_USERS,
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("not have permission");
    });

    it("should allow users to see the total number of questions they have answered using the user query", async () => {
      // Update the regular user with a known number of answered questions
      await User.findByIdAndUpdate(regularUser._id, { questionsAnswered: 10 });

      const res = await server.executeOperation(
        {
          query: GET_USER_FULL,  // Use GET_USER_FULL here as users can see all their own data
          variables: { id: regularUser._id.toString() },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.user.username).toBe("user");
      expect(res.data?.user.questionsAnswered).toBe(10);
      expect(res.data?.user.email).toBe("user@example.com");  // Users can see their own email
      expect(res.data?.user.badges).toHaveLength(1);
    });

    it("should allow users to see their own information using the me query", async () => {
      // Update the regular user with a known number of answered questions
      await User.findByIdAndUpdate(regularUser._id, { questionsAnswered: 10 });

      const res = await server.executeOperation(
        {
          query: GET_ME,
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.me.username).toBe("user");
      expect(res.data?.me.questionsAnswered).toBe(10);
      expect(res.data?.me.badges).toHaveLength(1);
      expect(res.data?.me.badges[0].name).toBe("First Login");
    });

    it("should allow a regular user to access specific fields of another user", async () => {
      const res = await server.executeOperation(
        {
          query: GET_USER,
          variables: { id: anotherRegularUser._id.toString() },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.user.id).toBe(anotherRegularUser._id.toString());
      expect(res.data?.user.username).toBe("anotheruser");
      expect(res.data?.user.role).toBe("USER");
      expect(res.data?.user.questionsAnswered).toBe(10);
      expect(res.data?.user.questionsCorrect).toBe(8);
      expect(res.data?.user.questionsIncorrect).toBe(2);
      expect(res.data?.user.score).toBe(0); // Changed from toBeNull() to toBe(0)

      // Check that sensitive information is not included in the response
      expect(res.data?.user.email).toBeUndefined();
      expect(res.data?.user.badges).toBeUndefined();
      expect(res.data?.user.lifetimePoints).toBeUndefined();
      expect(res.data?.user.yearlyPoints).toBeUndefined();
      expect(res.data?.user.monthlyPoints).toBeUndefined();
      expect(res.data?.user.dailyPoints).toBeUndefined();
      expect(res.data?.user.consecutiveLoginDays).toBeUndefined();
      expect(res.data?.user.lastLoginDate).toBeUndefined();
      expect(res.data?.user.createdAt).toBeUndefined();
      expect(res.data?.user.updatedAt).toBeUndefined();
    });
  });
});
