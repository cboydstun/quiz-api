// src/resolvers/types.ts

export type UserResolvers = {
  Query: {
    me: (parent: any, args: any, context: any) => Promise<any>;
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
  };
};

export type QuestionResolvers = {
  Query: {
    questions: () => Promise<any>;
    question: (parent: any, args: { id: string }) => Promise<any>;
    userResponses: (parent: any, args: any, context: any) => Promise<any>;
  };
  Mutation: {
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
    submitAnswer: (
      parent: any,
      args: { questionId: string; selectedAnswer: string },
      context: any
    ) => Promise<any>;
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

// Add this to the existing types
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
