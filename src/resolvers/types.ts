// src/resolvers/types.ts

import { Document } from 'mongoose';
import { IQuestion } from '../models/Question';

type QuestionDifficulty = 'basic' | 'intermediate' | 'advanced';
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_in_blank';
type QuestionStatus = 'draft' | 'review' | 'active' | 'archived';

interface QuestionFilters {
  difficulty?: QuestionDifficulty;
  type?: QuestionType;
  status?: QuestionStatus;
  mainTopic?: string;
  tags?: string[];
}

export type UserStats = {
  questionsAnswered?: number;
  questionsCorrect?: number;
  questionsIncorrect?: number;
  pointsEarned?: number;
  lifetimePoints?: number;
  yearlyPoints?: number;
  monthlyPoints?: number;
  dailyPoints?: number;
  consecutiveLoginDays?: number;
  lastLoginDate?: string;
};

export type UserResolvers = {
  Query: {
    me: (parent: any, args: any, context: any) => Promise<{
      id: string;
      username: string;
      email: string;
      role: string;
      score: number;
      questionsAnswered: number;
      questionsCorrect: number;
      questionsIncorrect: number;
      lifetimePoints: number;
      yearlyPoints: number;
      monthlyPoints: number;
      dailyPoints: number;
      consecutiveLoginDays: number;
      lastLoginDate: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    users: (parent: any, args: any, context: any) => Promise<any>;
    user: (parent: any, args: { id: string }, context: any) => Promise<any>;
  };
  Mutation: {
    changeUserRole: (
      parent: any,
      args: { userId: string; newRole: string },
      context: any
    ) => Promise<any>;
    deleteUser: (
      parent: any,
      args: { userId: string },
      context: any
    ) => Promise<boolean>;
    updateUserStats: (
      parent: any,
      args: { userId: string; stats: UserStats },
      context: any
    ) => Promise<any>;
    updateUsername: (
      parent: any,
      args: { username: string },
      context: any
    ) => Promise<{
      id: string;
      username: string;
    }>;
    updatePassword: (
      parent: any,
      args: { currentPassword: string; newPassword: string },
      context: any
    ) => Promise<{
      success: boolean;
      message: string;
    }>;
    updateLoginStreak: (
      parent: any,
      args: { userId: string },
      context: any
    ) => Promise<any>;
  };
};

export type QuestionResolvers = {
  Query: {
    questions: (
      parent: any,
      args: QuestionFilters,
      context: any
    ) => Promise<Document<unknown, any, IQuestion>[]>;
    question: (
      parent: any,
      args: { id: string },
      context: any
    ) => Promise<Document<unknown, any, IQuestion>>;
    userResponses: (
      parent: any,
      args: any,
      context: any
    ) => Promise<any>;
  };
  Mutation: {
    createQuestion: (
      parent: any,
      args: { input: any },
      context: any
    ) => Promise<Document<unknown, any, IQuestion>>;
    updateQuestion: (
      parent: any,
      args: { id: string; input: any },
      context: any
    ) => Promise<Document<unknown, any, IQuestion>>;
    deleteQuestion: (
      parent: any,
      args: { id: string },
      context: any
    ) => Promise<boolean>;
    submitAnswer: (
      parent: any,
      args: { questionId: string; selectedAnswer: string },
      context: any
    ) => Promise<{
      success: boolean;
      isCorrect: boolean;
      feedback: string;
      points: number;
    }>;
  };
};

export type AuthResolvers = {
  Query: {
    getGoogleAuthUrl: () => Promise<any>;
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
    authenticateWithGoogle: (
      parent: any,
      args: { code: string },
      context: any
    ) => Promise<any>;
  };
};

export type LeaderboardResolvers = {
  Query: {
    getLeaderboard: (
      parent: any,
      args: { limit?: number },
      context: any
    ) => Promise<{
      leaderboard: Array<{
        position: number;
        user: {
          id: string;
          username: string;
          email: string;
          role: string;
          score: number;
        };
        score: number;
      }>;
      currentUserEntry: {
        position: number;
        user: {
          id: string;
          username: string;
          email: string;
          role: string;
          score: number;
        };
        score: number;
      } | null;
    }>;
  };
};
