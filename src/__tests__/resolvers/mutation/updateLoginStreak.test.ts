// src/__tests__/resolvers/mutation/updateLoginStreak.test.ts

import resolvers from "../../../resolvers";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - updateLoginStreak", () => {
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
    consecutiveLoginDays: 7,
    lastLoginDate: new Date("2023-05-15"),
    badges: [
      {
        _id: "badge123",
        name: "First Login",
        earnedAt: new Date("2023-05-01"),
      },
    ],
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-05-15"),
  };

  it("should successfully update login streak as an admin", async () => {
    // Set the system time to a fixed date
    const mockDate = new Date("2023-05-16T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(mockDate);

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);

    const mockUser = {
      ...mockUpdatedUser,
      consecutiveLoginDays: 7,
      lastLoginDate: new Date("2023-05-15T00:00:00.000Z"),
      toObject: jest.fn().mockReturnValue(mockUpdatedUser),
    };

    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    (User.findByIdAndUpdate as jest.Mock).mockImplementation((id, update) => {
      return Promise.resolve({
        ...mockUser,
        ...update.$set,
        toObject: jest.fn().mockReturnValue({
          ...mockUpdatedUser,
          ...update.$set,
        }),
      });
    });

    const args = {
      userId: "user456",
    };

    const result = await resolvers.Mutation.updateLoginStreak(null, args, { req: {} } as any);

    expect(result.consecutiveLoginDays).toBe(8);
    expect(result.badges).toHaveLength(1);
    expect(result.badges[0].id).toBe("badge123");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user456",
      {
        $set: {
          lastLoginDate: mockDate,
          consecutiveLoginDays: 8,
        },
      },
      { new: true }
    );

    jest.useRealTimers();
  });

  it("should reset login streak if more than one day has passed", async () => {
    const mockDate = new Date("2023-05-18T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(mockDate);

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);

    const mockUser = {
      ...mockUpdatedUser,
      consecutiveLoginDays: 7,
      lastLoginDate: new Date("2023-05-15T00:00:00.000Z"), // Three days before
    };

    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    (User.findByIdAndUpdate as jest.Mock).mockImplementation((id, update) => {
      return Promise.resolve({
        ...mockUser,
        ...update.$set,
      });
    });

    const args = {
      userId: "user456",
    };

    const result = await resolvers.Mutation.updateLoginStreak(null, args, { req: {} } as any);

    expect(result.consecutiveLoginDays).toBe(1);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user456",
      {
        $set: {
          lastLoginDate: mockDate,
          consecutiveLoginDays: 1,
        },
      },
      { new: true }
    );

    jest.useRealTimers();
  });


  it("should not change login streak if user has already logged in today", async () => {
    const mockDate = new Date("2023-05-15T12:00:00.000Z");
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findById as jest.Mock).mockResolvedValue({
      ...mockUpdatedUser,
      consecutiveLoginDays: 7,
      lastLoginDate: new Date("2023-05-15T08:00:00.000Z"), // Earlier on the same day
    });
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUpdatedUser,
      consecutiveLoginDays: 7,
      lastLoginDate: mockDate,
    });

    const args = {
      userId: "user456",
    };

    const result = await resolvers.Mutation.updateLoginStreak(null, args, { req: {} } as any);

    expect(result.consecutiveLoginDays).toBe(7);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user456",
      {
        $set: {
          lastLoginDate: mockDate,
          consecutiveLoginDays: 7,
        },
      },
      { new: true }
    );

    jest.spyOn(global, 'Date').mockRestore();
  });

  it("should throw ForbiddenError for non-admin users", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockRegularUser);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError("You do not have permission to perform this action");
    });

    const args = {
      userId: "user456",
    };

    await expect(
      resolvers.Mutation.updateLoginStreak(null, args, { req: {} } as any)
    ).rejects.toThrow(ForbiddenError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockRegularUser, ["SUPER_ADMIN", "ADMIN"]);
    expect(User.findById).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should throw NotFoundError for non-existent user", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdminUser);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.findById as jest.Mock).mockResolvedValue(null);

    const args = {
      userId: "nonexistent123",
    };

    await expect(
      resolvers.Mutation.updateLoginStreak(null, args, { req: {} } as any)
    ).rejects.toThrow(NotFoundError);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdminUser, ["SUPER_ADMIN", "ADMIN"]);
    expect(User.findById).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});