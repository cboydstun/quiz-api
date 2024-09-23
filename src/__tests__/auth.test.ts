// src/__tests__/auth.test.ts

import { checkAuth, generateToken, DecodedUser } from "../utils/auth";
import { AuthenticationError } from "../utils/errors";
import jwt from "jsonwebtoken";
import resolvers from "../resolvers";
import { Model } from 'mongoose';
import User, { IUser } from '../models/User'
import { ApolloError } from "apollo-server-express";

// Mock external modules
jest.mock("jsonwebtoken");
jest.mock('../models/User');

const mockUser = {
  _id: 'some-id',
  email: 'test@example.com',
  // Add other properties as needed
} as IUser;

// Mock OAuth2Client methods on the prototype
jest.mock("google-auth-library", () => {
  const originalModule = jest.requireActual("google-auth-library");
  const { OAuth2Client } = originalModule;

  OAuth2Client.prototype.generateAuthUrl = jest.fn();
  OAuth2Client.prototype.getToken = jest.fn();
  OAuth2Client.prototype.verifyIdToken = jest.fn();

  return {
    ...originalModule,
    OAuth2Client,
  };
});

// Create a manual mock for the User model
jest.mock("../models/User", () => {
  const mockUserInstance = {
    save: jest.fn(),
  };

  const mockUserConstructor = jest.fn(() => mockUserInstance);

  return {
    __esModule: true,
    default: mockUserConstructor,
  };
});

import * as auth from "../utils/auth";
import { OAuth2Client } from "google-auth-library";
import { mock } from "node:test";

const mockGenerateAuthUrl = OAuth2Client.prototype.generateAuthUrl as jest.Mock;
const mockGetToken = OAuth2Client.prototype.getToken as jest.Mock;
const mockVerifyIdToken = OAuth2Client.prototype.verifyIdToken as jest.Mock;

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

describe("Authentication and Authorization", () => {
  describe("checkAuth", () => {
    beforeEach(() => {
      process.env.JWT_SECRET = "testsecret";
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("should return user data if a valid token is provided", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "test@example.com",
        role: "USER",
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);

      const context = {
        req: {
          headers: {
            authorization: "Bearer validtoken",
          },
        },
      };

      const result = checkAuth(context);

      expect(result).toEqual(mockUser);
      expect(jwt.verify).toHaveBeenCalledWith("validtoken", "testsecret");
    });

    it("should throw AuthenticationError if no authorization header is provided", () => {
      const context = { req: { headers: {} } };

      expect(() => checkAuth(context)).toThrow(AuthenticationError);
      expect(() => checkAuth(context)).toThrow(
        "Authorization header must be provided"
      );
    });

    it("should throw AuthenticationError if token is not in correct format", () => {
      const context = {
        req: {
          headers: {
            authorization: "InvalidToken",
          },
        },
      };

      expect(() => checkAuth(context)).toThrow(AuthenticationError);
      expect(() => checkAuth(context)).toThrow(
        'Authentication token must be "Bearer [token]"'
      );
    });

    it("should throw AuthenticationError if token is invalid", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const context = {
        req: {
          headers: {
            authorization: "Bearer invalidtoken",
          },
        },
      };

      expect(() => checkAuth(context)).toThrow(AuthenticationError);
      expect(() => checkAuth(context)).toThrow("Invalid/Expired token");
    });
  });

  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "test@example.com",
        role: "USER",
      };
      const mockToken = "mockjwttoken";
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = generateToken(mockUser);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { _id: mockUser._id, email: mockUser.email, role: mockUser.role },
        "testsecret",
        { expiresIn: "1d" }
      );
    });
  });

  describe("Google SSO", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    describe("getGoogleAuthUrl", () => {
      it("should return a Google auth URL", async () => {
        const mockUrl = "https://accounts.google.com/o/oauth2/v2/auth?...";
        mockGenerateAuthUrl.mockReturnValue(mockUrl);
      
        const result = await resolvers.Query.getGoogleAuthUrl();
      
        expect(result).toEqual({ url: mockUrl });
        expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
          access_type: "offline",
          scope: ["profile", "email"],
          redirect_uri: "http://localhost:3000/auth/google/callback"
        });
      });

      it("should throw ApolloError if generating URL fails", async () => {
        mockGenerateAuthUrl.mockImplementation(() => {
          throw new Error("Failed to generate URL");
        });

        await expect(
          resolvers.Query.getGoogleAuthUrl()
        ).rejects.toThrow(ApolloError);
      });
    });

    describe("authenticateWithGoogle", () => {
      it("should authenticate an existing user", async () => {
        const mockCode = "mock_google_code";
        const mockTokens = { id_token: "mock_id_token" };
        const mockPayload = {
          sub: "123456789",
          email: "user@example.com",
          name: "Test User",
        };
        const mockUser = {
          _id: "user_id",
          googleId: "123456789",
          email: "user@example.com",
          username: "Test User",
          role: "USER",
        };
      
        mockGetToken.mockResolvedValue({ tokens: mockTokens });
        mockVerifyIdToken.mockResolvedValue({
          getPayload: () => mockPayload,
        });
      
        const UserMock = User as jest.Mocked<Model<IUser>>;
        UserMock.findOne = jest.fn().mockResolvedValue(mockUser);
      
        jest.spyOn(auth, "generateToken").mockReturnValue("mocked_jwt_token");
      
        const result = await resolvers.Mutation.authenticateWithGoogle(
          null,
          { code: mockCode },
          {} as any
        );
      
        expect(result).toEqual({
          token: "mocked_jwt_token",
          user: mockUser,
        });
        expect(User.findOne).toHaveBeenCalledWith({
          $or: [
            { googleId: mockPayload.sub },
            { email: mockPayload.email }
          ]
        });
        expect(auth.generateToken).toHaveBeenCalledWith(mockUser);
      });

      it("should create and authenticate a new user", async () => {
        const mockCode = "mock_google_code";
        const mockTokens = { id_token: "mock_id_token" };
        const mockPayload = {
          sub: "987654321",
          email: "newuser@example.com",
          name: "New User",
        };
        const mockNewUserInstance = {
          _id: "new_user_id",
          googleId: "987654321",
          email: "newuser@example.com",
          username: "New User",
          role: "USER",
          save: jest.fn().mockResolvedValue(true),
        };
      
        mockGetToken.mockResolvedValue({ tokens: mockTokens });
        mockVerifyIdToken.mockResolvedValue({
          getPayload: () => mockPayload,
        });
      
        const UserMock = User as jest.Mocked<Model<IUser>>;
        UserMock.findOne = jest.fn().mockResolvedValue(null);
        (User as jest.MockedClass<typeof User>).mockImplementation(() => mockNewUserInstance as any);
      
        jest.spyOn(auth, "generateToken").mockReturnValue("mocked_jwt_token");
      
        const result = await resolvers.Mutation.authenticateWithGoogle(
          null,
          { code: mockCode },
          {} as any
        );
      
        expect(result).toEqual({
          token: "mocked_jwt_token",
          user: mockNewUserInstance,
        });
        expect(User.findOne).toHaveBeenCalledWith({
          $or: [
            { googleId: mockPayload.sub },
            { email: mockPayload.email }
          ]
        });
        expect(mockNewUserInstance.save).toHaveBeenCalled();
        expect(auth.generateToken).toHaveBeenCalledWith(mockNewUserInstance);
      });

      it("should throw AuthenticationError if Google token is invalid", async () => {
        mockGetToken.mockRejectedValue(new Error("Invalid token"));
      
        await expect(
          resolvers.Mutation.authenticateWithGoogle(
            null,
            { code: "mock_google_code" },
            {} as any
          )
        ).rejects.toThrow(AuthenticationError);
        await expect(
          resolvers.Mutation.authenticateWithGoogle(
            null,
            { code: "mock_google_code" },
            {} as any
          )
        ).rejects.toThrow("Failed to authenticate with Google");
      });
    });
  });
});
