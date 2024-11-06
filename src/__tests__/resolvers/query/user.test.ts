// src/__tests__/resolvers/query/user.test.ts

import resolvers from "../../../resolvers";
import {
  AuthenticationError,
  NotFoundError,
} from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Query resolvers - user", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return full user data for admin", async () => {
    const mockUser = {
      _id: { toString: () => "1" },
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: new Date("2023-05-01"),
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-05-01"),
    };

    const mockAdmin = {
      _id: "123",
      email: "admin@example.com",
      role: "ADMIN",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Query.user(null, { id: "1" }, { req: {} } as any);

    expect(result).toEqual({
      id: "1",
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: mockUser.lastLoginDate.toISOString(),
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
  });

  it("should return full user data for the same user", async () => {
    const mockUser = {
      _id: { toString: () => "1" },
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: new Date("2023-05-01"),
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-05-01"),
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue({ _id: "1", role: "USER" });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Query.user(null, { id: "1" }, { req: {} } as any);

    expect(result).toEqual({
      id: "1",
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: mockUser.lastLoginDate.toISOString(),
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
  });

  it("should return basic user data for non-admin users accessing other users", async () => {
    const mockUser = { _id: "456", email: "user@example.com", role: "USER" };
    const mockOtherUser = {
      _id: { toString: () => "1" },
      username: "otheruser",
      role: "USER",
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (User.findById as jest.Mock).mockResolvedValue(mockOtherUser);

    const result = await resolvers.Query.user(null, { id: "1" }, { req: {} } as any);

    expect(result).toEqual({
      id: "1",
      username: "otheruser",
      role: "USER",
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      score: 0,
    });
  });

  it("should throw NotFoundError if user does not exist", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({ _id: "123", role: "USER" });
    (User.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Query.user(null, { id: "999" }, { req: {} } as any)
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw AuthenticationError if not authenticated", async () => {
    (authUtils.checkAuth as jest.Mock).mockRejectedValue(
      new AuthenticationError("Not authenticated")
    );

    await expect(
      resolvers.Query.user(null, { id: "1" }, { req: {} } as any)
    ).rejects.toThrow(AuthenticationError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("should return the authenticated user's data including questionsAnswered for 'me' query", async () => {
    const mockUser = {
      _id: { toString: () => "1" },
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 15,
      questionsCorrect: 12,
      questionsIncorrect: 3,
      lifetimePoints: 1500,
      yearlyPoints: 750,
      monthlyPoints: 300,
      dailyPoints: 75,
      consecutiveLoginDays: 7,
      lastLoginDate: new Date("2023-05-15"),
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-05-15"),
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue({ _id: "1" });
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Query.me(null, {}, { req: {} } as any);

    expect(result).toEqual({
      id: "1",
      username: "user1",
      email: "user1@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 15,
      questionsCorrect: 12,
      questionsIncorrect: 3,
      lifetimePoints: 1500,
      yearlyPoints: 750,
      monthlyPoints: 300,
      dailyPoints: 75,
      consecutiveLoginDays: 7,
      lastLoginDate: mockUser.lastLoginDate.toISOString(),
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith("1");
  });
});