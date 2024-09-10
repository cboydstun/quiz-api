import { ApolloServer } from "apollo-server-express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User from "../../models/User";

let mongoServer: MongoMemoryServer;

const REGISTER_USER = `
  mutation RegisterUser($input: CreateUserInput!) {
    register(input: $input) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

const LOGIN_USER = `
  mutation LoginUser($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

describe("Authentication Integration Tests", () => {
  let server: ApolloServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set JWT secret for testing
    process.env.JWT_SECRET = "test-secret";

    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({ req }),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    // Clear JWT secret after tests
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("User Registration", () => {
    it("should register a new user successfully", async () => {
      const variables = {
        input: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          role: "USER",
        },
      };

      const res = await server.executeOperation({
        query: REGISTER_USER,
        variables,
      });

      expect(res.data?.register.user.username).toBe("testuser");
      expect(res.data?.register.user.email).toBe("test@example.com");
      expect(res.data?.register.user.role).toBe("USER");
      expect(res.data?.register.token).toBeTruthy();
    });

    it("should not register a user with an existing email", async () => {
      const variables = {
        input: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          role: "USER",
        },
      };

      await server.executeOperation({ query: REGISTER_USER, variables });
      const res = await server.executeOperation({
        query: REGISTER_USER,
        variables,
      });

      expect(res.errors).toBeTruthy();
      expect(res.errors?.[0].message).toContain(
        "Username or email already exists"
      );
    });
  });

  describe("User Login", () => {
    beforeEach(async () => {
      const variables = {
        input: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          role: "USER",
        },
      };
      await server.executeOperation({ query: REGISTER_USER, variables });
    });

    it("should login a user successfully", async () => {
      const variables = {
        email: "test@example.com",
        password: "password123",
      };

      const res = await server.executeOperation({
        query: LOGIN_USER,
        variables,
      });

      expect(res.data?.login.user.username).toBe("testuser");
      expect(res.data?.login.user.email).toBe("test@example.com");
      expect(res.data?.login.user.role).toBe("USER");
      expect(res.data?.login.token).toBeTruthy();
    });

    it("should not login with incorrect password", async () => {
      const variables = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const res = await server.executeOperation({
        query: LOGIN_USER,
        variables,
      });

      expect(res.errors).toBeTruthy();
      expect(res.errors?.[0].message).toBe("Invalid credentials");
    });

    it("should not login with non-existent email", async () => {
      const variables = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      const res = await server.executeOperation({
        query: LOGIN_USER,
        variables,
      });

      expect(res.errors).toBeTruthy();
      expect(res.errors?.[0].message).toBe("Invalid credentials");
    });
  });
});
