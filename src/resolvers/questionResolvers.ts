// src/resolvers/questionResolvers.ts

import Question from "../models/Question";
import UserResponse from "../models/UserResponse";
import User from "../models/User";
import { checkAuth } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import { UserInputError, NotFoundError } from "../utils/errors";
import { QuestionResolvers } from "./types";
import mongoose from "mongoose";
import { createQuestionSchema } from "../utils/validationSchemas";
import { ValidationError } from "yup";

const questionResolvers: QuestionResolvers = {
  Query: {
    questions: async () => Question.find().populate("createdBy"),
    question: async (_, { id }) => {
      const question = await Question.findById(id).populate("createdBy");
      if (!question) {
        throw new NotFoundError("Question not found");
      }
      return question;
    },
    userResponses: async (_, __, context) => {
      const user = await checkAuth(context);
      return UserResponse.find({ userId: user._id }).populate("questionId");
    },
  },
  Mutation: {
    createQuestion: async (_, { input }, context) => {
      const user = await checkAuth(context);
      await checkPermission(user, ["SUPER_ADMIN", "ADMIN", "EDITOR"]);

      try {
        // Validate input using the createQuestionSchema
        const validatedInput = await createQuestionSchema.validate(input, { abortEarly: false });

        const newQuestion = new Question({
          ...validatedInput,
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
          hint: populatedQuestion.hint,
          points: populatedQuestion.points,
          createdBy: {
            id: populatedQuestion.createdBy._id,
            username: populatedQuestion.createdBy.username,
          },
        };
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new UserInputError(`Invalid input: ${error.errors.join(", ")}`);
        }
        throw error;
      }
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
        if (input.hint !== undefined) question.hint = input.hint;
        if (input.points !== undefined) question.points = input.points;

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
    submitAnswer: async (_, { questionId, selectedAnswer }, context) => {
      const user = await checkAuth(context);

      const question = await Question.findById(questionId);
      if (!question) {
        throw new Error("Question not found");
      }

      const isCorrect = question.correctAnswer === selectedAnswer;

      const userResponse = new UserResponse({
        userId: user._id,
        questionId: question._id,
        selectedAnswer,
        isCorrect,
      });

      await userResponse.save();

      if (isCorrect) {
        // Increment the user's score by the question's points value for each correct answer
        await User.findByIdAndUpdate(user._id, { $inc: { score: question.points } });
      }

      return {
        success: true,
        isCorrect,
      };
    },
  },
};

export default questionResolvers;
