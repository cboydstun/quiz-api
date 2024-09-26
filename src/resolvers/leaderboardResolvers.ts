// src/resolvers/leaderboardResolvers.ts

import { checkAuth } from "../utils/auth";
import User from "../models/User";
import { LeaderboardResolvers } from "./types";
import { logger } from "../utils/logger";
import { ApolloError, AuthenticationError } from "apollo-server-express";

const leaderboardResolvers: LeaderboardResolvers = {
  Query: {
    getLeaderboard: async (_, { limit = 10 }, context) => {
      try {
        const currentUser = await checkAuth(context);
        if (!currentUser) {
          logger.warn("User not authenticated in getLeaderboard");
          throw new AuthenticationError("Not authenticated");
        }

        const allUsers = await User.find({ score: { $ne: null } })
          .sort({ score: -1, username: 1 })
          .lean();

        const leaderboardEntries = allUsers.map((user, index) => ({
          position: index + 1,
          user: {
            id: user._id.toString(),
            username: user.username || user.email.split('@')[0],
            email: user.email,
            role: user.role,
            score: user.score ?? 0,
          },
          score: user.score ?? 0,
        }));

        const topLeaderboard = leaderboardEntries.slice(0, limit);

        const currentUserEntry = leaderboardEntries.find(entry => entry.user.id === currentUser._id.toString());

        return {
          leaderboard: topLeaderboard,
          currentUserEntry: currentUserEntry || null,
        };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          throw error;
        }
        logger.error("Error in getLeaderboard resolver", { error });
        throw new ApolloError("Failed to fetch leaderboard", "LEADERBOARD_ERROR", { originalError: error });
      }
    },
  },
};

export default leaderboardResolvers;