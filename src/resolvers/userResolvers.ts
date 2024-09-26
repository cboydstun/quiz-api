// src/resolvers/userResolvers.ts

import User from "../models/User";
import { checkAuth, generateToken } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { UserResolvers } from "./types";

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
  },
};

export default userResolvers;
