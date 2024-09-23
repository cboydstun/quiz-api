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

  it("should return the authenticated user", async () => {
    const mockUser = {
      _id: "123",
      id: "123",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
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
