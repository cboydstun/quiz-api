// src/__tests__/resolvers/mutation/register.test.ts

import resolvers from "../../../resolvers";
import { UserInputError } from "../../../utils/errors";
import User from "../../../models/User";
import * as authUtils from "../../../utils/auth";

jest.mock("../../../models/User");
jest.mock("../../../utils/auth");

describe("Mutation resolvers - register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authUtils.generateToken as jest.Mock).mockReturnValue("dummy_token");
  });

  it("should create a new user when input is valid", async () => {
    const mockUser = {
      _id: "123",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
      save: jest.fn().mockResolvedValue(true),
    };

    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User as unknown as jest.Mock).mockImplementation(() => mockUser);

    const result = await resolvers.Mutation.register(
      null,
      {
        input: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        },
      },
      {} as any
    );

    expect(result.user).toEqual(
      expect.objectContaining({
        username: "testuser",
        email: "test@example.com",
        role: "USER",
      })
    );
    expect(result.token).toBe("dummy_token");
    expect(authUtils.generateToken).toHaveBeenCalledWith(
      expect.objectContaining(mockUser)
    );
    expect(mockUser.save).toHaveBeenCalled();
  });

  it("should throw UserInputError when username or email already exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      username: "existinguser",
      email: "existing@example.com",
    });

    await expect(
      resolvers.Mutation.register(
        null,
        {
          input: {
            username: "existinguser",
            email: "existing@example.com",
            password: "password123",
          },
        },
        {} as any
      )
    ).rejects.toThrow(UserInputError);
  });
});