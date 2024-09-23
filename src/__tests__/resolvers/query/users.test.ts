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
        id: "1",
        username: "user1",
        email: "user1@example.com",
        role: "USER",
      },
      {
        id: "2",
        username: "user2",
        email: "user2@example.com",
        role: "EDITOR",
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

    expect(result).toEqual(mockUsers);
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
