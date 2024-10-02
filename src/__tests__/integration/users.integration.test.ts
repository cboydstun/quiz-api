import { ApolloServer } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User from "../../models/User";
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
      skills
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
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      skills
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
      skills
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

const UPDATE_LOGIN_STREAK = `
  mutation UpdateLoginStreak($userId: ID!) {
    updateLoginStreak(userId: $userId) {
      id
      username
      consecutiveLoginDays
      lastLoginDate
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

    // Create an admin user
    adminUser = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "adminpass",
      role: "ADMIN",
    });

    // Create a regular user with an initial lastLoginDate
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    regularUser = await User.create({
      username: "user",
      email: "user@example.com",
      password: "userpass",
      role: "USER",
      lastLoginDate: yesterday,
      consecutiveLoginDays: 1,
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
      expect(res.data?.users).toHaveLength(2);
      expect(res.data?.users[0].username).toBe("admin");
      expect(res.data?.users[1].username).toBe("user");
      expect(res.data?.users[0]).toHaveProperty("questionsAnswered");
      expect(res.data?.users[0]).toHaveProperty("lifetimePoints");
      expect(res.data?.users[0]).toHaveProperty("yearlyPoints");
      expect(res.data?.users[0]).toHaveProperty("monthlyPoints");
      expect(res.data?.users[0]).toHaveProperty("dailyPoints");
      expect(res.data?.users[0]).toHaveProperty("consecutiveLoginDays");
      expect(res.data?.users[0]).toHaveProperty("lastLoginDate");
    });

    it("should fetch a specific user by ID", async () => {
      const res = await server.executeOperation(
        {
          query: GET_USER,
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
  });

  describe("User Mutations", () => {
    it("should allow an admin to change a user's role", async () => {
      const res = await server.executeOperation(
        {
          query: CHANGE_USER_ROLE,
          variables: {
            userId: regularUser._id.toString(),
            newRole: "EDITOR",
          },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.changeUserRole.username).toBe("user");
      expect(res.data?.changeUserRole.role).toBe("EDITOR");
    });

    it("should not allow a regular user to change roles", async () => {
      const res = await server.executeOperation(
        {
          query: CHANGE_USER_ROLE,
          variables: {
            userId: regularUser._id.toString(),
            newRole: "EDITOR",
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("not have permission");
    });

    it("should not allow changing a user's role to SUPER_ADMIN", async () => {
      const res = await server.executeOperation(
        {
          query: CHANGE_USER_ROLE,
          variables: {
            userId: regularUser._id.toString(),
            newRole: "SUPER_ADMIN",
          },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain(
        "Cannot change role to SUPER_ADMIN"
      );
    });

    it("should allow an admin to update user stats", async () => {
      const res = await server.executeOperation(
        {
          query: UPDATE_USER_STATS,
          variables: {
            userId: regularUser._id.toString(),
            stats: {
              questionsAnswered: 10,
              questionsCorrect: 8,
              questionsIncorrect: 2,
              pointsEarned: 100,
              newSkills: ["Math", "Science"],
              consecutiveLoginDays: 5,
              lifetimePoints: 1000,
              yearlyPoints: 500,
              monthlyPoints: 200,
              dailyPoints: 50,
            },
          },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.updateUserStats.questionsAnswered).toBe(10);
      expect(res.data?.updateUserStats.questionsCorrect).toBe(8);
      expect(res.data?.updateUserStats.questionsIncorrect).toBe(2);
      expect(res.data?.updateUserStats.lifetimePoints).toBe(1000);
      expect(res.data?.updateUserStats.yearlyPoints).toBe(500);
      expect(res.data?.updateUserStats.monthlyPoints).toBe(200);
      expect(res.data?.updateUserStats.dailyPoints).toBe(50);
      expect(res.data?.updateUserStats.skills).toContain("Math");
      expect(res.data?.updateUserStats.skills).toContain("Science");
      expect(res.data?.updateUserStats.consecutiveLoginDays).toBe(5);
    });

    it("should not allow a regular user to update user stats", async () => {
      const res = await server.executeOperation(
        {
          query: UPDATE_USER_STATS,
          variables: {
            userId: regularUser._id.toString(),
            stats: {
              questionsAnswered: 10,
              questionsCorrect: 8,
              questionsIncorrect: 2,
              pointsEarned: 100,
              newSkills: ["Math", "Science"],
              consecutiveLoginDays: 5,
            },
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("not have permission");
    });

    it("should allow an admin to update login streak", async () => {
      // Set up the test to simulate a login on the next day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await User.findByIdAndUpdate(regularUser._id, { 
        lastLoginDate: yesterday,
        consecutiveLoginDays: 1
      });
    
      const UPDATE_LOGIN_STREAK = `
        mutation UpdateLoginStreak($userId: ID!) {
          updateLoginStreak(userId: $userId) {
            username
            consecutiveLoginDays
            lastLoginDate
          }
        }
      `;
    
      const res = await server.executeOperation(
        {
          query: UPDATE_LOGIN_STREAK,
          variables: { userId: regularUser._id.toString() },
        },
        {
          req: {
            headers: {
              authorization: `Bearer ${generateToken(adminUser)}`,
            },
          },
        } as any
      );
    
      expect(res.errors).toBeUndefined();
      expect(res.data?.updateLoginStreak.username).toBe("user");
      expect(res.data?.updateLoginStreak.consecutiveLoginDays).toBe(2);
      expect(res.data?.updateLoginStreak.lastLoginDate).toBeDefined();
    });
  });

  describe("User Deletion", () => {
    it("should allow an admin to delete a regular user", async () => {
      const res = await server.executeOperation(
        {
          query: DELETE_USER,
          variables: { userId: regularUser._id.toString() },
        },
        createMockContext(adminUser)
      );
  
      expect(res.errors).toBeUndefined();
      expect(res.data?.deleteUser).toBe(true);
  
      // Verify the user was deleted
      const deletedUser = await User.findById(regularUser._id);
      expect(deletedUser).toBeNull();
    });
  
    it("should not allow a regular user to delete another user", async () => {
      const res = await server.executeOperation(
        {
          query: DELETE_USER,
          variables: { userId: adminUser._id.toString() },
        },
        createMockContext(regularUser)
      );
  
      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("not have permission");
  
      // Verify the admin user still exists
      const admin = await User.findById(adminUser._id);
      expect(admin).not.toBeNull();
    });
  
    it("should throw a ForbiddenError when trying to delete a SUPER_ADMIN", async () => {
      const superAdmin = await User.create({
        username: "superadmin",
        email: "superadmin@example.com",
        password: "superadminpass",
        role: "SUPER_ADMIN",
      });
  
      const res = await server.executeOperation(
        {
          query: DELETE_USER,
          variables: { userId: superAdmin._id.toString() },
        },
        createMockContext(adminUser) // Admin trying to delete SUPER_ADMIN
      );
  
      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("Cannot delete a SUPER_ADMIN");
  
      // Verify the SUPER_ADMIN still exists
      const fetchedSuperAdmin = await User.findById(superAdmin._id);
      expect(fetchedSuperAdmin).not.toBeNull();
    });
  
    it("should throw a NotFoundError when trying to delete a non-existent user", async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
  
      const res = await server.executeOperation(
        {
          query: DELETE_USER,
          variables: { userId: nonExistentUserId.toString() },
        },
        createMockContext(adminUser)
      );
  
      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("User not found");
    });
  });  
});
