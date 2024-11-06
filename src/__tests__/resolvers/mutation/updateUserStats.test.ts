// src/__tests__/resolvers/mutation/updateUserStats.test.ts

import resolvers from "../../../resolvers";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";
import { UserStats } from "../../../resolvers/types";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - updateUserStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAdminUser = {
    _id: "admin123",
    email: "admin@example.com",
    role: "ADMIN",
  };

  const mockRegularUser = {
    _id: "user123",
    email: "user@example.com",
    role: "USER",
  };

  const mockUpdatedUser = {
    _id: "user456",
    username: "testuser",
    email: "testuser@example.com",
    role: "USER",
    score: 150,
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

  it("should successfully update user stats as an admin", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

    const args = {
      userId: "user456",
      stats: {
        questionsAnswered: 5,
        questionsCorrect: 4,
        questionsIncorrect: 1,
        pointsEarned: 50,
        consecutiveLoginDays: 7,
        lifetimePoints: 1500,
        yearlyPoints: 750,
        monthlyPoints: 300,
        dailyPoints: 75,
        lastLoginDate: "2023-05-15T00:00:00.000Z",
      },
    };

    const result = await resolvers.Mutation.updateUserStats(null, args, { req: {} } as any);

    expect(result).toEqual(mockUpdatedUser);
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdminUser, ["SUPER_ADMIN", "ADMIN"]);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user456",
      expect.objectContaining({
        $inc: {
          questionsAnswered: 5,
          questionsCorrect: 4,
          questionsIncorrect: 1,
        },
        $set: {
          lifetimePoints: 1500,
          yearlyPoints: 750,
          monthlyPoints: 300,
          dailyPoints: 75,
          lastLoginDate: new Date("2023-05-15T00:00:00.000Z"),
          consecutiveLoginDays: 7,
        }
      }),
      { new: true }
    );
  });

  it("should throw ForbiddenError for non-admin users", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockRegularUser);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError("You do not have permission to perform this action");
    });

    const args = {
      userId: "user456",
      stats: {
        questionsAnswered: 5,
        questionsCorrect: 4,
        questionsIncorrect: 1,
        pointsEarned: 50,
        consecutiveLoginDays: 7,
        lifetimePoints: 1500,
        yearlyPoints: 750,
        monthlyPoints: 300,
        dailyPoints: 75,
      },
    };

    await expect(
      resolvers.Mutation.updateUserStats(null, args, { req: {} } as any)
    ).rejects.toThrow(ForbiddenError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockRegularUser, ["SUPER_ADMIN", "ADMIN"]);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should throw NotFoundError for non-existent user", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    const args = {
      userId: "nonexistent123",
      stats: {
        questionsAnswered: 5,
        questionsCorrect: 4,
        questionsIncorrect: 1,
        pointsEarned: 50,
        consecutiveLoginDays: 7,
        lifetimePoints: 1500,
        yearlyPoints: 750,
        monthlyPoints: 300,
        dailyPoints: 75,
      },
    };

    await expect(
      resolvers.Mutation.updateUserStats(null, args, { req: {} } as any)
    ).rejects.toThrow(NotFoundError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdminUser, ["SUPER_ADMIN", "ADMIN"]);
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
  });

  it("should handle invalid input gracefully", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

    const args = {
      userId: "user456",
      stats: {
        questionsAnswered: -5, // Invalid negative value
        questionsCorrect: "invalid" as unknown as number, // Invalid string instead of number
        questionsIncorrect: 1,
        pointsEarned: 50,
        consecutiveLoginDays: 7,
        lifetimePoints: -100, // Invalid negative value
        yearlyPoints: "invalid" as unknown as number, // Invalid string instead of number
        monthlyPoints: 300,
        dailyPoints: 75,
      } as UserStats, // Type assertion to UserStats
    };

    const result = await resolvers.Mutation.updateUserStats(null, args, { req: {} } as any);

    expect(result).toEqual(mockUpdatedUser);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user456",
      expect.objectContaining({
        $inc: {
          questionsAnswered: 0, // Should default to 0 for invalid input
          questionsCorrect: 0, // Should default to 0 for invalid input
          questionsIncorrect: 1,
        },
        $set: {
          lifetimePoints: 0, // Should default to 0 for invalid input
          yearlyPoints: 0, // Should default to 0 for invalid input
          monthlyPoints: 300,
          dailyPoints: 75,
          lastLoginDate: expect.any(Date),
          consecutiveLoginDays: 7,
        }
      }),
      { new: true }
    );
  });
});