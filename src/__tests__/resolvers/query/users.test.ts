// src/__tests__/resolvers/query/users.test.ts

import resolvers from "../../../resolvers";
import {
  AuthenticationError,
  ForbiddenError,
} from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Query resolvers - users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all users for admin", async () => {
    const mockUsers = [
      {
        _id: "1",
        username: "user1",
        email: "user1@example.com",
        role: "USER",
        badges: [
          { _id: "badge1", name: "Badge 1", description: "Description 1", earnedAt: new Date("2023-01-01") }
        ],
        lastLoginDate: new Date("2023-05-01"),
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-05-01"),
        toObject: jest.fn().mockReturnThis(),
      },
      {
        _id: "2",
        username: "user2",
        email: "user2@example.com",
        role: "EDITOR",
        badges: [],
        lastLoginDate: new Date("2023-05-02"),
        createdAt: new Date("2023-01-02"),
        updatedAt: new Date("2023-05-02"),
        toObject: jest.fn().mockReturnThis(),
      },
    ];

    const mockAdmin = {
      _id: "123",
      email: "admin@example.com",
      role: "ADMIN",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
    (User.find as jest.Mock).mockResolvedValue(mockUsers);

    const result = await resolvers.Query.users(null, {}, { req: {} } as any);

    expect(result).toEqual(mockUsers.map(user => ({
      ...user,
      id: user._id,
      badges: user.badges.map(badge => ({
        ...badge,
        id: badge._id,
        earnedAt: badge.earnedAt.toISOString(),
      })),
      lastLoginDate: user.lastLoginDate.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })));
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
      "SUPER_ADMIN",
      "ADMIN",
    ]);
  });

  it("should throw AuthenticationError if not authenticated", async () => {
    (authUtils.checkAuth as jest.Mock).mockRejectedValue(
      new AuthenticationError("Not authenticated")
    );

    await expect(
      resolvers.Query.users(null, {}, { req: {} } as any)
    ).rejects.toThrow(AuthenticationError);
  });

  it("should throw ForbiddenError for non-admin users", async () => {
    const mockUser = { _id: "123", email: "user@example.com", role: "USER" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError(
        "You do not have permission to perform this action"
      );
    });

    await expect(
      resolvers.Query.users(null, {}, { req: {} } as any)
    ).rejects.toThrow(ForbiddenError);
  });
});
