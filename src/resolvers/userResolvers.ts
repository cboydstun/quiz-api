// src/resolvers/userResolvers.ts

import User from "../models/User";
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
        score: user.score,
        questionsAnswered: user.questionsAnswered,
        questionsCorrect: user.questionsCorrect,
        questionsIncorrect: user.questionsIncorrect,
        skills: user.skills,
        lifetimePoints: user.lifetimePoints,
        yearlyPoints: user.yearlyPoints,
        monthlyPoints: user.monthlyPoints,
        dailyPoints: user.dailyPoints,
        consecutiveLoginDays: user.consecutiveLoginDays,
        lastLoginDate: user.lastLoginDate ? user.lastLoginDate.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    users: async (_, __, context) => {
      const user = await checkAuth(context);
      checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);
      return User.find();
    },
    user: async (_, { id }, context) => {
      const decodedUser = await checkAuth(context);
      await checkPermission(decodedUser, ["SUPER_ADMIN", "ADMIN"]);

      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        score: user.score,
        questionsAnswered: user.questionsAnswered,
        questionsCorrect: user.questionsCorrect,
        questionsIncorrect: user.questionsIncorrect,
        skills: user.skills,
        lifetimePoints: user.lifetimePoints,
        yearlyPoints: user.yearlyPoints,
        monthlyPoints: user.monthlyPoints,
        dailyPoints: user.dailyPoints,
        consecutiveLoginDays: user.consecutiveLoginDays,
        lastLoginDate: user.lastLoginDate ? user.lastLoginDate.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
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
        newSkills: Array.isArray(stats.newSkills) ? stats.newSkills : [],
        lifetimePoints: Math.max(0, Number(stats.lifetimePoints) || 0),
        yearlyPoints: Math.max(0, Number(stats.yearlyPoints) || 0),
        monthlyPoints: Math.max(0, Number(stats.monthlyPoints) || 0),
        dailyPoints: Math.max(0, Number(stats.dailyPoints) || 0),
        consecutiveLoginDays: Math.max(0, Number(stats.consecutiveLoginDays) || 0),
        lastLoginDate: stats.lastLoginDate ? new Date(stats.lastLoginDate) : new Date(),
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
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
          $addToSet: { skills: { $each: sanitizedStats.newSkills } },
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new NotFoundError("User not found");
      }

      return updatedUser;
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
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN"]);

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

      return updatedUser;
    },
  },
};

export default userResolvers;
