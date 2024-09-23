// src/__tests__/resolvers/mutation/deleteUser.test.ts

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

describe("Mutation resolvers - deleteUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a user when called by an admin or super admin", async () => {
    const mockAdmin = {
      _id: "123",
      role: "ADMIN",
      email: "admin@example.com",
    };
    const mockUser = { _id: "456", username: "testuser", role: "USER" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(true);
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);

    const result = await resolvers.Mutation.deleteUser(
      null,
      { userId: "456" },
      { req: {} } as any
    );

    expect(result).toBe(true);
    expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
      "SUPER_ADMIN",
      "ADMIN",
    ]);
    expect(User.findById).toHaveBeenCalledWith("456");
    expect(User.findByIdAndDelete).toHaveBeenCalledWith("456");
  });

  it("should throw NotFoundError if the user to be deleted does not exist", async () => {
    const mockAdmin = {
      _id: "123",
      role: "ADMIN",
      email: "admin@example.com",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockReturnValue(true);
    (User.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Mutation.deleteUser(null, { userId: "999" }, {
        req: {},
      } as any)
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError if attempting to delete a SUPER_ADMIN", async () => {
    const mockAdmin = {
      _id: "123",
      role: "ADMIN",
      email: "admin@example.com",
    };
    const mockSuperAdmin = {
      _id: "456",
      role: "SUPER_ADMIN",
      username: "superadminuser",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError("Cannot delete a SUPER_ADMIN");
    });
    (User.findById as jest.Mock).mockResolvedValue(mockSuperAdmin);

    await expect(
      resolvers.Mutation.deleteUser(null, { userId: "456" }, {
        req: {},
      } as any)
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw AuthenticationError if the user is not authenticated", async () => {
    (authUtils.checkAuth as jest.Mock).mockRejectedValue(
      new AuthenticationError("Not authenticated")
    );

    await expect(
      resolvers.Mutation.deleteUser(null, { userId: "456" }, {
        req: {},
      } as any)
    ).rejects.toThrow(AuthenticationError);
  });

  it("should throw ForbiddenError if the user does not have sufficient permissions", async () => {
    const mockUser = {
      _id: "123",
      role: "USER",
      email: "user@example.com",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError("Not authorized");
    });

    await expect(
      resolvers.Mutation.deleteUser(null, { userId: "456" }, {
        req: {},
      } as any)
    ).rejects.toThrow(ForbiddenError);
  });
});