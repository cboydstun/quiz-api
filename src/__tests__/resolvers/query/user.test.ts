// src/__tests__/resolvers/query/user.test.ts

import resolvers from "../../../resolvers";
import {
  AuthenticationError,
  ForbiddenError,
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

  it("should return a specific user for admin", async () => {
    const mockUser = {
      _id: { toString: () => "1" },
      username: "user1",
      email: "user1@example.com",
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

    const mockAdmin = {
      _id: "123",
      email: "admin@example.com",
      role: "ADMIN",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Query.user(
      null,
      { id: "1" },
      { req: {} } as any
    );

    expect(result).toEqual({
      id: "1",
      username: "user1",
      email: "user1@example.com",
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
      lastLoginDate: mockUser.lastLoginDate,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    });
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
      "SUPER_ADMIN",
      "ADMIN",
    ]);
    expect(User.findById).toHaveBeenCalledWith("1");
  });

  it("should throw NotFoundError if user does not exist", async () => {
    const mockAdmin = {
      _id: "123",
      email: "admin@example.com",
      role: "ADMIN",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Query.user(null, { id: "999" }, { req: {} } as any)
    ).rejects.toThrow(NotFoundError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
      "SUPER_ADMIN",
      "ADMIN",
    ]);
    expect(User.findById).toHaveBeenCalledWith("999");
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

  it("should throw ForbiddenError for non-admin users", async () => {
    const mockUser = { _id: "456", email: "user@example.com", role: "USER" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError(
        "You do not have permission to perform this action"
      );
    });

    await expect(
      resolvers.Query.user(null, { id: "1" }, { req: {} } as any)
    ).rejects.toThrow(ForbiddenError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
      "SUPER_ADMIN",
      "ADMIN",
    ]);
    expect(User.findById).not.toHaveBeenCalled();
  });
});