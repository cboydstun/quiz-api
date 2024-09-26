// src/__tests__/resolvers/leaderboardResolvers.test.ts

import { DecodedUser } from "../../utils/auth";
import User from "../../models/User";
import * as authUtils from "../../utils/auth";
import { logger } from "../../utils/logger";
import leaderboardResolvers from "../../resolvers/leaderboardResolvers";

jest.mock("../../models/User");
jest.mock("../../utils/auth");
jest.mock("../../utils/logger");

describe("Leaderboard Resolvers", () => {
  const mockContext = { req: {} };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle authenticated user", async () => {
    const mockCurrentUser: DecodedUser = {
      _id: "user1",
      email: "user1@example.com",
      role: "USER",
    };
    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockCurrentUser);

    const mockUsers = [
      { _id: "user1", username: "user1", email: "user1@example.com", role: "USER", score: 100 },
      { _id: "user2", username: "user2", email: "user2@example.com", role: "USER", score: 200 },
    ];

    (User.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });

    const result = await leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext);

    expect(result.leaderboard).toHaveLength(2);
    expect(result.currentUserEntry).not.toBeNull();
    expect(result.currentUserEntry?.user.id).toBe("user1");
  });

  it("should handle unauthenticated user", async () => {
    (authUtils.checkAuth as jest.Mock).mockRejectedValue(new Error("Not authenticated"));

    const mockUsers = [
      { _id: "user1", username: "user1", email: "user1@example.com", role: "USER", score: 100 },
      { _id: "user2", username: "user2", email: "user2@example.com", role: "USER", score: 200 },
    ];

    (User.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });

    const result = await leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext);

    expect(result.leaderboard).toHaveLength(2);
    expect(result.currentUserEntry).toBeNull();
    expect(logger.info).toHaveBeenCalledWith("Unauthenticated user accessing leaderboard");
  });

  it("should handle database error", async () => {
    (User.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error("Database error")),
    });

    await expect(leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext))
      .rejects
      .toThrow("Failed to fetch leaderboard");

    expect(logger.error).toHaveBeenCalledWith("Error in getLeaderboard resolver", expect.any(Object));
  });
});