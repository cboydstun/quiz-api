import { resolvers } from "../../../resolvers";
import { UserResolvers } from "../../../resolvers/types";
import {
  NotFoundError,
  ForbiddenError,
} from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

const typedMutationResolvers = resolvers.Mutation as UserResolvers['Mutation'];

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - changeUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should change a user's role", async () => {
    const mockAdmin = { id: "123", role: "ADMIN" };
    const mockUser = { id: "456", role: "USER" };
    const updatedUser = { ...mockUser, role: "EDITOR" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

    const result = await typedMutationResolvers.changeUserRole(
      null,
      { userId: "456", newRole: "EDITOR" },
      { req: {} } as any
    );

    expect(result).toEqual(updatedUser);
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(
      expect.anything(),
      ["SUPER_ADMIN", "ADMIN"]
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "456",
      { role: "EDITOR" },
      { new: true }
    );
  });

  it("should throw NotFoundError if user does not exist", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      id: "123",
      role: "ADMIN",
    });
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    await expect(
      typedMutationResolvers.changeUserRole(
        null,
        { userId: "999", newRole: "EDITOR" },
        { req: {} } as any
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError if trying to change to SUPER_ADMIN role", async () => {
    const mockAdmin = {
      _id: "123",
      role: "ADMIN",
      email: "admin@example.com",
      username: "adminuser",
    };
    const mockUser = {
      _id: "456",
      role: "USER",
      email: "user@example.com",
      username: "regularuser",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
    (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
      throw new ForbiddenError("Cannot change role to SUPER_ADMIN");
    });
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      typedMutationResolvers.changeUserRole(
        null,
        { userId: "456", newRole: "SUPER_ADMIN" },
        { req: {} } as any
      )
    ).rejects.toThrow(ForbiddenError);
  });
});