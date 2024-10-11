// src/resolvers/userResolvers.ts

import User, { IBadge } from "../models/User";
import { checkAuth } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { UserResolvers, UserStats } from "./types";

const userResolvers: UserResolvers = {
  Query: {
    me: async (_, __, context) => {
      const decodedUser = await checkAuth(context);
      const user = await User.findById(decodedUser._id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }
      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        score: user.score || 0,
        questionsAnswered: user.questionsAnswered || 0,
        questionsCorrect: user.questionsCorrect || 0,
        questionsIncorrect: user.questionsIncorrect || 0,
        badges: user.badges.map((badge: IBadge) => ({
          ...badge.toObject(),
          id: badge._id.toString(),
          earnedAt: badge.earnedAt.toISOString()
        })),
        lifetimePoints: user.lifetimePoints || 0,
        yearlyPoints: user.yearlyPoints || 0,
        monthlyPoints: user.monthlyPoints || 0,
        dailyPoints: user.dailyPoints || 0,
        consecutiveLoginDays: user.consecutiveLoginDays || 0,
        lastLoginDate: user.lastLoginDate ? user.lastLoginDate.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    users: async (_, __, context) => {
      const user = await checkAuth(context);
      checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);
      const users = await User.find();
      return users.map(user => {
        const userObj = user.toObject ? user.toObject() : user;
        return {
          ...userObj,
          id: user._id.toString(),
          badges: user.badges.map((badge: IBadge) => ({
            ...(badge.toObject ? badge.toObject() : badge),
            id: badge._id.toString(),
            earnedAt: badge.earnedAt.toISOString()
          })),
          lastLoginDate: user.lastLoginDate ? user.lastLoginDate.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      });
    },
    user: async (_, { id }, context) => {
      const decodedUser = await checkAuth(context);

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(decodedUser.role);
      const isSameUser = decodedUser._id.toString() === id;

      const baseUserData = {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        questionsAnswered: user.questionsAnswered || 0,
        questionsCorrect: user.questionsCorrect || 0,
        questionsIncorrect: user.questionsIncorrect || 0,
        score: isAdmin || isSameUser ? (user.score || 0) : 0,
      };

      if (isAdmin || isSameUser) {
        return {
          ...baseUserData,
          email: user.email,
          badges: user.badges.map((badge: IBadge) => ({
            ...(badge.toObject ? badge.toObject() : badge),
            id: badge._id.toString(),
            earnedAt: badge.earnedAt.toISOString()
          })),
          lifetimePoints: user.lifetimePoints || 0,
          yearlyPoints: user.yearlyPoints || 0,
          monthlyPoints: user.monthlyPoints || 0,
          dailyPoints: user.dailyPoints || 0,
          consecutiveLoginDays: user.consecutiveLoginDays || 0,
          lastLoginDate: user.lastLoginDate ? user.lastLoginDate.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      } else {
        return baseUserData;
      }
    },
  },
  Mutation: {
    changeUserRole: async (_, { userId, newRole }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);

      if (newRole === "SUPER_ADMIN") {
        throw new ForbiddenError("Cannot change role to SUPER_ADMIN");
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true }
      );
      if (!updatedUser) {
        throw new NotFoundError("User not found");
      }
      return updatedUser;
    },
    deleteUser: async (_, { userId }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);

      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        throw new NotFoundError("User not found");
      }

      if (userToDelete.role === "SUPER_ADMIN") {
        throw new ForbiddenError("Cannot delete a SUPER_ADMIN");
      }

      await User.findByIdAndDelete(userId);
      return true;
    },
    updateUserStats: async (_, { userId, stats }: { userId: string, stats: UserStats }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);

      // Validate and sanitize input
      const sanitizedStats = {
        questionsAnswered: Math.max(0, Number(stats.questionsAnswered) || 0),
        questionsCorrect: Math.max(0, Number(stats.questionsCorrect) || 0),
        questionsIncorrect: Math.max(0, Number(stats.questionsIncorrect) || 0),
        pointsEarned: Math.max(0, Number(stats.pointsEarned) || 0),
        newBadge: stats.newBadge,
        lifetimePoints: Math.max(0, Number(stats.lifetimePoints) || 0),
        yearlyPoints: Math.max(0, Number(stats.yearlyPoints) || 0),
        monthlyPoints: Math.max(0, Number(stats.monthlyPoints) || 0),
        dailyPoints: Math.max(0, Number(stats.dailyPoints) || 0),
        consecutiveLoginDays: Math.max(0, Number(stats.consecutiveLoginDays) || 0),
        lastLoginDate: stats.lastLoginDate ? new Date(stats.lastLoginDate) : new Date(),
      };

      const updateOperation: any = {
        $inc: {
          questionsAnswered: sanitizedStats.questionsAnswered,
          questionsCorrect: sanitizedStats.questionsCorrect,
          questionsIncorrect: sanitizedStats.questionsIncorrect,
        },
        $set: {
          lifetimePoints: sanitizedStats.lifetimePoints,
          yearlyPoints: sanitizedStats.yearlyPoints,
          monthlyPoints: sanitizedStats.monthlyPoints,
          dailyPoints: sanitizedStats.dailyPoints,
          lastLoginDate: sanitizedStats.lastLoginDate,
          consecutiveLoginDays: sanitizedStats.consecutiveLoginDays,
        },
      };

      if (sanitizedStats.newBadge) {
        updateOperation.$push = {
          badges: {
            ...sanitizedStats.newBadge,
            earnedAt: new Date(),
          },
        };
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateOperation,
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundError("User not found");
      }

      const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
      return {
        ...updatedUser.toObject(),
        id: updatedUser._id.toString(),
        badges: updatedUser.badges.map((badge: IBadge) => ({
          ...badge.toObject(),
          id: badge._id.toString(),
          earnedAt: badge.earnedAt.toISOString()
        })),
        lastLoginDate: updatedUser.lastLoginDate ? updatedUser.lastLoginDate.toISOString() : null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      };
    },
    updateUsername: async (_, { username }: { username: string }, context) => {
      const decodedUser = await checkAuth(context);

      if (!username || username.trim().length < 3) {
        throw new ValidationError("Username must be at least 3 characters long");
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new ValidationError("Username is already taken");
      }

      const updatedUser = await User.findByIdAndUpdate(
        decodedUser._id,
        { username },
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundError("User not found");
      }

      return {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
      };
    },
    updatePassword: async (_, { currentPassword, newPassword }: { currentPassword: string, newPassword: string }, context) => {
      const decodedUser = await checkAuth(context);

      const user = await User.findById(decodedUser._id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new AuthenticationError("Current password is incorrect");
      }

      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: "Password updated successfully",
      };
    },
    updateLoginStreak: async (_, { userId }, context) => {
      const authenticatedUser = await checkAuth(context);

      // Allow users to update their own login streak or admins to update any user's streak
      if (authenticatedUser._id.toString() !== userId) {
        await checkPermission(authenticatedUser, ["SUPER_ADMIN", "ADMIN"]);
      }

      const userToUpdate = await User.findById(userId);
      if (!userToUpdate) {
        throw new NotFoundError("User not found");
      }

      const now = new Date();
      const lastLogin = userToUpdate.lastLoginDate || new Date(0);

      // Strip time components to compare dates only
      const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastLoginDateOnly = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());

      const timeDiff = nowDateOnly.getTime() - lastLoginDateOnly.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);

      let newConsecutiveLoginDays = userToUpdate.consecutiveLoginDays || 0;

      if (daysDiff === 0) {
        // User has already logged in today, no change
      } else if (daysDiff === 1) {
        // User logged in on consecutive days
        newConsecutiveLoginDays += 1;
      } else {
        // User missed a day or more, reset streak
        newConsecutiveLoginDays = 1;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            lastLoginDate: now,
            consecutiveLoginDays: newConsecutiveLoginDays,
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundError("User not found");
      }

      const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
      return {
        ...userObj,
        id: updatedUser._id.toString(),
        badges: updatedUser.badges.map((badge: IBadge) => ({
          ...(badge.toObject ? badge.toObject() : badge),
          id: badge._id.toString(),
          earnedAt: badge.earnedAt.toISOString()
        })),
        lastLoginDate: updatedUser.lastLoginDate ? updatedUser.lastLoginDate.toISOString() : null,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      };
    },
  },
};

export default userResolvers;