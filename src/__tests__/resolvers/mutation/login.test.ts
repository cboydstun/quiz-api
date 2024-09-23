// src/__tests__/resolvers/mutation/login.test.ts

import resolvers from "../../../resolvers";
import { AuthenticationError } from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");

describe("Mutation resolvers - login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return token and user for valid credentials", async () => {
    const mockUser = {
      id: "123",
      email: "test@example.com",
      password: "hashedpassword",
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (authUtils.generateToken as jest.Mock).mockReturnValue("dummy_token");

    const result = await resolvers.Mutation.login(
      null,
      { email: "test@example.com", password: "password123" },
      {} as any
    );

    expect(result).toEqual({
      token: "dummy_token",
      user: mockUser,
    });
    expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
  });

  it("should throw AuthenticationError for invalid credentials", async () => {
    const mockUser = {
      email: "test@example.com",
      password: "hashedpassword",
      comparePassword: jest.fn().mockResolvedValue(false),
    };
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      resolvers.Mutation.login(
        null,
        { email: "test@example.com", password: "wrongpassword" },
        {} as any
      )
    ).rejects.toThrow(AuthenticationError);
  });
});
