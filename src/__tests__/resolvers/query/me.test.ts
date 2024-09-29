// src/__tests__/resolvers/query/me.test.ts

import resolvers from "../../../resolvers";
import { AuthenticationError } from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");

describe("Query resolvers - me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the authenticated user with all new fields", async () => {
    const mockUser = {
      _id: "123",
      id: "123",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      skills: ["Math", "Science"],
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: new Date("2023-05-01"),
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-05-01"),
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      role: "USER",
    });

    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Query.me(null, {}, { req: {} } as any);

    expect(result).toEqual({
      id: "123",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
      score: 100,
      questionsAnswered: 10,
      questionsCorrect: 8,
      questionsIncorrect: 2,
      skills: ["Math", "Science"],
      lifetimePoints: 1000,
      yearlyPoints: 500,
      monthlyPoints: 200,
      dailyPoints: 50,
      consecutiveLoginDays: 5,
      lastLoginDate: mockUser.lastLoginDate.toISOString(),
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(User.findById).toHaveBeenCalledWith("123");
  });

  it("should throw AuthenticationError if user is not found", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      role: "USER",
    });

    (User.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Query.me(null, {}, { req: {} } as any)
    ).rejects.toThrow(AuthenticationError);
  });

  it("should throw AuthenticationError if not authenticated", async () => {
    (authUtils.checkAuth as jest.Mock).mockRejectedValue(
      new AuthenticationError("Not authenticated")
    );

    await expect(
      resolvers.Query.me(null, {}, { req: {} } as any)
    ).rejects.toThrow(AuthenticationError);
  });
});
