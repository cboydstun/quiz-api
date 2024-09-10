// src/__tests__/auth.test.ts

import { checkAuth, generateToken, DecodedUser } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import { AuthenticationError, ForbiddenError } from "../utils/errors";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("Authentication and Authorization", () => {
  describe("checkAuth", () => {
    it("should return user data if a valid token is provided", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "test@example.com",
        role: "USER",
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);

      const context = {
        req: { headers: { authorization: "Bearer validtoken" } },
      };
      const result = checkAuth(context);

      expect(result).toEqual(mockUser);
      expect(jwt.verify).toHaveBeenCalledWith(
        "validtoken",
        process.env.JWT_SECRET
      );
    });

    it("should throw AuthenticationError if no authorization header is provided", () => {
      const context = { req: { headers: {} } };
      expect(() => checkAuth(context)).toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError if the token is invalid", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const context = {
        req: { headers: { authorization: "Bearer invalidtoken" } },
      };
      expect(() => checkAuth(context)).toThrow(AuthenticationError);
    });
  });

  describe("checkPermission", () => {
    it("should not throw an error if user has required permission", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "admin@example.com",
        role: "ADMIN",
      };
      expect(() =>
        checkPermission(mockUser, ["ADMIN", "SUPER_ADMIN"])
      ).not.toThrow();
    });

    it("should throw ForbiddenError if user does not have required permission", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "user@example.com",
        role: "USER",
      };
      expect(() => checkPermission(mockUser, ["ADMIN", "SUPER_ADMIN"])).toThrow(
        ForbiddenError
      );
    });

    it("should throw ForbiddenError if user object is not provided", () => {
      expect(() =>
        checkPermission({} as DecodedUser, ["ADMIN", "SUPER_ADMIN"])
      ).toThrow(ForbiddenError);
    });
  });

  describe("generateToken", () => {
    it("should generate a valid JWT token", () => {
      const mockUser: DecodedUser = {
        _id: "123",
        email: "test@example.com",
        role: "USER",
      };
      (jwt.sign as jest.Mock).mockReturnValue("generatedtoken");

      const token = generateToken(mockUser);

      expect(token).toBe("generatedtoken");
      expect(jwt.sign).toHaveBeenCalledWith(
        { _id: mockUser._id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
    });
  });
});
