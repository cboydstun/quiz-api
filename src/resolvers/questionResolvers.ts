// src/resolvers/questionResolvers.ts

import Question from "../models/Question";
import UserResponse from "../models/UserResponse";
import User from "../models/User";
import { checkAuth } from "../utils/auth";
import { checkPermission } from "../utils/permissions";
import { UserInputError, NotFoundError } from "../utils/errors";
import { QuestionResolvers } from "./types";
import mongoose, { Document } from "mongoose";
import { createQuestionSchema, updateQuestionSchema } from "../utils/validationSchemas";
import { ValidationError } from "yup";
import { IQuestion } from "../models/Question";

interface UpdateQuestionInput {
  prompt?: string;
  questionText?: string;
  answers?: Array<{
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  type?: 'multiple_choice' | 'true-false' | 'fill-in-blank';
  topics?: {
    mainTopic: string;
    subTopics: string[];
  };
  sourceReferences?: Array<{
    page: number;
    chapter?: string;
    section?: string;
    paragraph?: string;
    lines: {
      start: number;
      end: number;
    };
    text: string;
  }>;
  learningObjectives?: string[];
  relatedQuestions?: string[];
  tags?: string[];
  hint?: string;
  points?: number;
  feedback?: {
    correct: string;
    incorrect: string;
  };
  status?: 'draft' | 'review' | 'active' | 'archived';
}

const questionResolvers: QuestionResolvers = {
  Query: {
    questions: async (_, { difficulty, type, status, mainTopic, tags }) => {
      let query: any = {};

      if (difficulty) query.difficulty = difficulty;
      if (type) query.type = type;
      if (status) query['metadata.status'] = status;
      if (mainTopic) query['topics.mainTopic'] = mainTopic;
      if (tags && tags.length > 0) query.tags = { $all: tags };

      const questions = await Question.find(query)
        .populate('metadata.createdBy')
        .populate('metadata.lastModifiedBy')
        .populate('relatedQuestions')
        .exec();

      return questions;
    },
    question: async (_, { id }) => {
      const question = await Question.findById(id)
        .populate('metadata.createdBy')
        .populate('metadata.lastModifiedBy')
        .populate('relatedQuestions')
        .exec();

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
          metadata: {
            createdBy: user._id,
            lastModifiedBy: user._id,
            version: 1,
            status: 'draft'
          },
          stats: {
            timesAnswered: 0,
            correctAnswers: 0,
            averageTimeToAnswer: 0,
            difficultyRating: 3
          }
        });

        const savedQuestion = await newQuestion.save();
        const populatedQuestion = await Question.findById(savedQuestion._id)
          .populate('metadata.createdBy')
          .populate('metadata.lastModifiedBy')
          .populate('relatedQuestions')
          .exec();

        if (!populatedQuestion) {
          throw new Error('Failed to create question');
        }

        return populatedQuestion;
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
        const validatedInput = await updateQuestionSchema.validate(input, { abortEarly: false }) as UpdateQuestionInput;

        let question;
        try {
          question = await Question.findById(id);
        } catch (error) {
          if (error instanceof mongoose.Error.CastError) {
            throw new NotFoundError("Question not found");
          }
          throw error;
        }

        if (!question) {
          throw new NotFoundError("Question not found");
        }

        // Update fields using type-safe approach
        if (validatedInput.prompt !== undefined) question.prompt = validatedInput.prompt;
        if (validatedInput.questionText !== undefined) question.questionText = validatedInput.questionText;
        if (validatedInput.answers !== undefined) question.answers = validatedInput.answers;
        if (validatedInput.difficulty !== undefined) question.difficulty = validatedInput.difficulty;
        if (validatedInput.type !== undefined) question.type = validatedInput.type;
        if (validatedInput.topics !== undefined) question.topics = validatedInput.topics;
        if (validatedInput.sourceReferences !== undefined) question.sourceReferences = validatedInput.sourceReferences;
        if (validatedInput.learningObjectives !== undefined) question.learningObjectives = validatedInput.learningObjectives;
        if (validatedInput.relatedQuestions !== undefined) question.relatedQuestions = validatedInput.relatedQuestions.map(id => new mongoose.Types.ObjectId(id));
        if (validatedInput.tags !== undefined) question.tags = validatedInput.tags;
        if (validatedInput.hint !== undefined) question.hint = validatedInput.hint;
        if (validatedInput.points !== undefined) question.points = validatedInput.points;
        if (validatedInput.feedback !== undefined) question.feedback = validatedInput.feedback;
        if (validatedInput.status !== undefined) question.metadata.status = validatedInput.status;

        // Update metadata
        question.metadata.lastModifiedBy = user._id;
        question.metadata.version += 1;
        question.metadata.updatedAt = new Date();

        const updatedQuestion = await question.save();
        const populatedQuestion = await Question.findById(updatedQuestion._id)
          .populate('metadata.createdBy')
          .populate('metadata.lastModifiedBy')
          .populate('relatedQuestions')
          .exec();

        if (!populatedQuestion) {
          throw new Error('Failed to update question');
        }

        return populatedQuestion;
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new UserInputError(`Invalid input: ${error.errors.join(", ")}`);
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
      const startTime = Date.now();

      const question = await Question.findById(questionId);
      if (!question) {
        throw new NotFoundError("Question not found");
      }

      // Find the selected answer in the question's answers array
      const answer = question.answers.find(a => a.text === selectedAnswer);
      if (!answer) {
        throw new UserInputError("Invalid answer selected");
      }

      const isCorrect = answer.isCorrect;
      const timeToAnswer = (Date.now() - startTime) / 1000; // Convert to seconds

      // Create user response
      const userResponse = new UserResponse({
        userId: user._id,
        questionId: question._id,
        selectedAnswer,
        isCorrect,
        timeToAnswer
      });

      await userResponse.save();

      // Calculate new average time
      const currentStats = question.stats || {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      };

      const newTimesAnswered = currentStats.timesAnswered + 1;
      const newAverageTime = (
        (currentStats.averageTimeToAnswer * currentStats.timesAnswered + timeToAnswer) /
        newTimesAnswered
      );

      // Update question stats using a single atomic update
      await Question.findByIdAndUpdate(questionId, {
        $inc: {
          'stats.timesAnswered': 1,
          'stats.correctAnswers': isCorrect ? 1 : 0
        },
        $set: {
          'stats.averageTimeToAnswer': newAverageTime
        }
      });

      // Update user stats
      const updateObject: any = {
        $inc: {
          questionsAnswered: 1,
          score: isCorrect ? question.points : 0,
        },
      };

      if (isCorrect) {
        updateObject.$inc.questionsCorrect = 1;
      } else {
        updateObject.$inc.questionsIncorrect = 1;
      }

      await User.findByIdAndUpdate(user._id, updateObject);

      return {
        success: true,
        isCorrect,
        feedback: isCorrect ? question.feedback.correct : question.feedback.incorrect,
        points: isCorrect ? question.points : 0
      };
    }
  },
};

export default questionResolvers;
