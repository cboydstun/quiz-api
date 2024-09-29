import { ApolloServer } from "apollo-server-express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User from "../../models/User";
import { OAuth2Client } from "google-auth-library";
import * as googleAuth from "../../resolvers/authResolvers";

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
  }
`;

const GET_GOOGLE_AUTH_URL = `
  query GetGoogleAuthUrl {
    getGoogleAuthUrl {
      url
    }
  }
`;

const AUTHENTICATE_WITH_GOOGLE = `
  mutation AuthenticateWithGoogle($code: String!) {
    authenticateWithGoogle(code: $code) {
      token
      user {
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
      expect(res.data?.register.user.score).toBe(0);
      expect(res.data?.register.user.questionsAnswered).toBe(0);
      expect(res.data?.register.user.skills).toEqual([]);
      expect(res.data?.register.user.lifetimePoints).toBe(0);
      expect(res.data?.register.user.consecutiveLoginDays).toBe(0);
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
      expect(res.data?.login.user.score).toBe(0);
      expect(res.data?.login.user.questionsAnswered).toBe(0);
      expect(res.data?.login.user.skills).toEqual([]);
      expect(res.data?.login.user.lifetimePoints).toBe(0);
      expect(res.data?.login.user.consecutiveLoginDays).toBe(0);
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

  describe("Google Single Sign On", () => {
    let mockGenerateAuthUrl: jest.Mock;
    let mockGetToken: jest.Mock;
    let mockVerifyIdToken: jest.Mock;

    beforeEach(() => {
      mockGenerateAuthUrl = jest.fn();
      mockGetToken = jest.fn();
      mockVerifyIdToken = jest.fn();

      const mockClient = {
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        verifyIdToken: mockVerifyIdToken,
      };

      jest
        .spyOn(googleAuth, "createOAuth2Client")
        .mockReturnValue(mockClient as any);
      (googleAuth as any).client = mockClient;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return a Google auth URL", async () => {
      const mockUrl = "https://accounts.google.com/o/oauth2/v2/auth?...";
      mockGenerateAuthUrl.mockReturnValue(mockUrl);

      const res = await server.executeOperation({
        query: GET_GOOGLE_AUTH_URL,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data?.getGoogleAuthUrl.url).toBe(mockUrl);
    });

    it("should authenticate a user with a Google code", async () => {
      const mockGooglePayload = {
        sub: "123456789",
        email: "user@example.com",
        name: "Test User",
      };

      mockGetToken.mockResolvedValue({ tokens: { id_token: "mock_id_token" } });
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockGooglePayload,
      });

      const res = await server.executeOperation({
        query: AUTHENTICATE_WITH_GOOGLE,
        variables: { code: "mock_google_code" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data?.authenticateWithGoogle.user.email).toBe(
        "user@example.com"
      );
      expect(res.data?.authenticateWithGoogle.token).toBeTruthy();
      expect(res.data?.authenticateWithGoogle.user.score).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.questionsAnswered).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.skills).toEqual([]);
      expect(res.data?.authenticateWithGoogle.user.lifetimePoints).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.consecutiveLoginDays).toBe(0);
    });

    it("should create a new user if authenticating for the first time", async () => {
      const mockGooglePayload = {
        sub: "987654321",
        email: "newuser@example.com",
        name: "New User",
      };

      mockGetToken.mockResolvedValue({ tokens: { id_token: "mock_id_token" } });
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockGooglePayload,
      });

      const res = await server.executeOperation({
        query: AUTHENTICATE_WITH_GOOGLE,
        variables: { code: "mock_google_code" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data?.authenticateWithGoogle.user.email).toBe(
        "newuser@example.com"
      );
      expect(res.data?.authenticateWithGoogle.token).toBeTruthy();
      expect(res.data?.authenticateWithGoogle.user.score).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.questionsAnswered).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.skills).toEqual([]);
      expect(res.data?.authenticateWithGoogle.user.lifetimePoints).toBe(0);
      expect(res.data?.authenticateWithGoogle.user.consecutiveLoginDays).toBe(0);

      // Verify the user was created in the database
      const createdUser = await User.findOne({ email: "newuser@example.com" });
      expect(createdUser).not.toBeNull();
      expect(createdUser?.username).toBe("New User");
    });
  });
});
