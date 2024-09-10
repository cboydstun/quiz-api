// src/resolvers/index.ts
import mongoose from "mongoose";
import User from "../models/User";
import Question from "../models/Question";
import { checkAuth, generateToken } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  NotFoundError,
} from "../utils/errors";

type Resolvers = {
  Query: {
    me: (parent: any, args: any, context: any) => Promise<any>;
    users: (parent: any, args: any, context: any) => Promise<any>;
    user: (parent: any, args: { id: string }, context: any) => Promise<any>;
    questions: () => Promise<any>;
    question: (parent: any, args: { id: string }) => Promise<any>;
  };
  Mutation: {
    register: (
      parent: any,
      args: {
        input: {
          username: string;
          email: string;
          password: string;
          role?: string;
        };
      },
      context: any
    ) => Promise<any>;
    login: (
      parent: any,
      args: { email: string; password: string },
      context: any
    ) => Promise<any>;
    createQuestion: (
      parent: any,
      args: { input: any },
      context: any
    ) => Promise<any>;
    updateQuestion: (
      parent: any,
      args: { id: string; input: any },
      context: any
    ) => Promise<any>;
    deleteQuestion: (
      parent: any,
      args: { id: string },
      context: any
    ) => Promise<boolean>;
    changeUserRole: (
      parent: any,
      args: { userId: string; newRole: string },
      context: any
    ) => Promise<any>;
  };
};

interface DecodedUser {
  id: string;
  email: string;
  role: string;
}

const resolvers: Resolvers = {
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
    questions: async () => Question.find().populate("createdBy"),
    question: async (_, { id }) => {
      const question = await Question.findById(id).populate("createdBy");
      if (!question) {
        throw new NotFoundError("Question not found");
      }
      return question;
    },
  },
  Mutation: {
    register: async (_, { input: { username, email, password, role } }) => {
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        throw new UserInputError("Username or email already exists");
      }

      const user = new User({
        username,
        email,
        password,
        role: role || "USER",
      });
      await user.save();

      const token = generateToken(user);
      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError("Invalid credentials");
      }

      const isValid = await user.comparePassword(password);
      if (!isValid) {
        throw new AuthenticationError("Invalid credentials");
      }

      const token = generateToken(user);
      return { token, user };
    },
    createQuestion: async (_, { input }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN", "EDITOR"]);

      const { prompt, questionText, answers, correctAnswer } = input;

      if (!answers.includes(correctAnswer)) {
        throw new UserInputError(
          "The correct answer must be one of the provided answers"
        );
      }

      const newQuestion = new Question({
        prompt,
        questionText,
        answers,
        correctAnswer,
        createdBy: user._id,
      });

      const savedQuestion = await newQuestion.save();

      const populatedQuestion = await savedQuestion.populate("createdBy");

      return {
        id: populatedQuestion._id,
        prompt: populatedQuestion.prompt,
        questionText: populatedQuestion.questionText,
        answers: populatedQuestion.answers,
        correctAnswer: populatedQuestion.correctAnswer,
        createdBy: {
          id: populatedQuestion.createdBy._id,
          username: populatedQuestion.createdBy.username,
        },
      };
    },

    updateQuestion: async (_, { id, input }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN", "EDITOR"]);

      try {
        const question = await Question.findById(id);
        if (!question) {
          throw new NotFoundError("Question not found");
        }

        if (input.prompt) question.prompt = input.prompt;
        if (input.questionText) question.questionText = input.questionText;
        if (input.answers) question.answers = input.answers;
        if (input.correctAnswer) {
          if (!question.answers.includes(input.correctAnswer)) {
            throw new UserInputError(
              "The correct answer must be one of the provided answers"
            );
          }
          question.correctAnswer = input.correctAnswer;
        }

        const updatedQuestion = await question.save();
        return updatedQuestion.populate("createdBy");
      } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
          throw new NotFoundError("Question not found");
        }
        throw error;
      }
    },
    deleteQuestion: async (_, { id }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN", "EDITOR"]);

      try {
        const question = await Question.findById(id);
        if (!question) {
          throw new NotFoundError("Question not found");
        }

        await Question.findByIdAndDelete(id);
        return true;
      } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
          throw new NotFoundError("Question not found");
        }
        throw error;
      }
    },
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
  },
};

export default resolvers;
