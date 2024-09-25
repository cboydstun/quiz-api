// src/resolvers/leaderboardResolvers.ts

import { checkAuth } from "../utils/auth";
import User from "../models/User";
import { LeaderboardResolvers } from "./types";
import { logger } from "../utils/logger";
import { ApolloError } from "apollo-server-express";

const leaderboardResolvers: LeaderboardResolvers = {
  Query: {
    getLeaderboard: async (_, { limit = 10 }, context) => {
      try {
        const currentUser = await checkAuth(context);
        if (!currentUser) {
          logger.warn("User not authenticated in getLeaderboard");
          return {
            leaderboard: [],
            currentUserEntry: null,
          };
        }

        const leaderboard = await User.find({ score: { $ne: null } })
          .sort({ score: -1, username: 1 })
          .limit(limit)
          .lean();

        if (!leaderboard || leaderboard.length === 0) {
          logger.warn("No users found for leaderboard");
          return {
            leaderboard: [],
            currentUserEntry: null,
          };
        }

        const leaderboardEntries = leaderboard.map((user, index) => ({
          position: index + 1,
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            score: user.score ?? 0,  // Use nullish coalescing to default to 0
          },
          score: user.score ?? 0,  // Use nullish coalescing to default to 0
        }));

        let currentUserEntry = null;
        if (currentUser.score != null) {  // Check if score is not null or undefined
          const currentUserPosition = await User.countDocuments({
            score: { $gt: currentUser.score, $ne: null }
          }) + 1;
          currentUserEntry = {
            position: currentUserPosition,
            user: {
              id: currentUser._id.toString(),
              username: currentUser.email,
              email: currentUser.email,
              role: currentUser.role,
              score: currentUser.score,
            },
            score: currentUser.score,
          };
        }

        return {
          leaderboard: leaderboardEntries,
          currentUserEntry: currentUserEntry,
        };
      } catch (error) {
        logger.error("Error in getLeaderboard resolver", { error });
        throw new ApolloError("Failed to fetch leaderboard", "LEADERBOARD_ERROR", { originalError: error });
      }
    },
  },
};

export default leaderboardResolvers;