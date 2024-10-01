// src/resolvers/userResolvers.ts

import User from "../models/User";
import { checkAuth, generateToken } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { UserResolvers, UserStats } from "./types";
import bcrypt from "bcryptjs";

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
        lastLoginDate: user.lastLoginDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
        consecutiveLoginDays: Math.max(0, Number(stats.consecutiveLoginDays) || 0),
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            questionsAnswered: sanitizedStats.questionsAnswered,
            questionsCorrect: sanitizedStats.questionsCorrect,
            questionsIncorrect: sanitizedStats.questionsIncorrect,
            lifetimePoints: sanitizedStats.pointsEarned,
            yearlyPoints: sanitizedStats.pointsEarned,
            monthlyPoints: sanitizedStats.pointsEarned,
            dailyPoints: sanitizedStats.pointsEarned,
          },
          $addToSet: { skills: { $each: sanitizedStats.newSkills } },
          $set: {
            lastLoginDate: new Date(),
            consecutiveLoginDays: sanitizedStats.consecutiveLoginDays,
          },
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
      console.log('updatePassword mutation called');

      const decodedUser = await checkAuth(context);
      console.log('Decoded user:', decodedUser);

      const user = await User.findById(decodedUser._id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      console.log('Found user:', user);

      const isMatch = await user.comparePassword(currentPassword);
      console.log('Password match:', isMatch);

      if (!isMatch) {
        throw new AuthenticationError("Current password is incorrect");
      }

      user.password = newPassword;
      await user.save();

      console.log('Password updated successfully');

      return {
        success: true,
        message: "Password updated successfully",
      };
    }
  },
};

export default userResolvers;
