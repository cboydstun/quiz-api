// src/resolvers/leaderboardResolvers.ts

import { IResolvers } from '@graphql-tools/utils';
import { checkAuth, DecodedUser } from "../utils/auth";
import User from "../models/User";
import { LeaderboardResolvers } from "./types";
import { logger } from "../utils/logger";
import { ApolloError } from "apollo-server-express";

// Helper function to mask email
const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  let maskedUsername;
  if (username.length <= 2) {
    maskedUsername = username.charAt(0) + '*'.repeat(username.length - 1);
  } else {
    // Limit the mask to three asterisks for longer usernames
    maskedUsername = username.charAt(0) + '***' + username.charAt(username.length - 1);
  }
  return `${maskedUsername}@${domain}`;
};

const leaderboardResolvers: IResolvers = {
  Query: {
    getLeaderboard: async (_, { limit = 10 }, context) => {
      let currentUser: DecodedUser | null = null;
      try {
        currentUser = await checkAuth(context);
      } catch (authError) {
        logger.info("Unauthenticated user accessing leaderboard");
        // We'll continue without a current user
      }

      try {
        const allUsers = await User.find({ score: { $ne: null } })
          .sort({ score: -1, username: 1 })
          .lean();

        const leaderboardEntries = allUsers.map((user, index) => ({
          position: index + 1,
          user: {
            id: user._id.toString(),
            username: user.username || user.email.split("@")[0],
            email: maskEmail(user.email), // Mask the email
            role: user.role,
            score: user.score ?? 0,
          },
          score: user.score ?? 0,
        }));

        const topLeaderboard = leaderboardEntries.slice(0, limit);

        let currentUserEntry = null;
        if (currentUser && currentUser._id) {
          currentUserEntry = leaderboardEntries.find(
            (entry) => entry.user.id === currentUser?._id.toString()
          ) || null;
        }

        return {
          leaderboard: topLeaderboard,
          currentUserEntry: currentUserEntry,
        };
      } catch (error) {
        logger.error("Error in getLeaderboard resolver", { error });
        throw new ApolloError(
          "Failed to fetch leaderboard",
          "LEADERBOARD_ERROR",
          { originalError: error }
        );
      }
    },
  },
};

export default leaderboardResolvers;