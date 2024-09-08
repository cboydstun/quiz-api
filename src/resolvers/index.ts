// src/resolvers/index.ts

import User from '../models/User';
import Question from '../models/Question';
import { checkAuth, generateToken } from '../utils/auth';
import { checkPermission } from '../utils/permissions';
import { AuthenticationError, ForbiddenError, UserInputError, NotFoundError } from '../utils/errors';

type Resolvers = {
  Query: {
    me: (parent: any, args: any, context: any) => Promise<any>;
    users: (parent: any, args: any, context: any) => Promise<any>;
    user: (parent: any, args: { id: string }, context: any) => Promise<any>;
    questions: () => Promise<any>;
    question: (parent: any, args: { id: string }) => Promise<any>;
  };
  Mutation: {
    register: (parent: any, args: { input: { username: string; email: string; password: string; role?: string } }, context: any) => Promise<any>;
    login: (parent: any, args: { email: string; password: string }, context: any) => Promise<any>;
    createQuestion: (parent: any, args: { input: any }, context: any) => Promise<any>;
    updateQuestion: (parent: any, args: { id: string; input: any }, context: any) => Promise<any>;
    deleteQuestion: (parent: any, args: { id: string }, context: any) => Promise<boolean>;
    changeUserRole: (parent: any, args: { userId: string; newRole: string }, context: any) => Promise<any>;
  };
};

const resolvers: Resolvers = {
  Query: {
    me: async (_, __, context) => {
      const user = await checkAuth(context);
      return user;
    },
    users: async (_, __, context) => {
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN']);
      return User.find();
    },
    user: async (_, { id }, context) => {
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN']);
      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return user;
    },
    questions: async () => Question.find().populate('createdBy'),
    question: async (_, { id }) => {
      const question = await Question.findById(id).populate('createdBy');
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      return question;
    },
    },
  Mutation: {
    register: async (_, { input: { username, email, password, role } }) => {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        throw new UserInputError('Username or email already exists');
      }

      const user = new User({ username, email, password, role: role || 'USER' });
      await user.save();

      const token = generateToken(user);
      return { token, user };
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      const isValid = await user.comparePassword(password);
      if (!isValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      const token = generateToken(user);
      return { token, user };
    },
    createQuestion: async (_, { input }, context) => {
      const user = await checkAuth(context);
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

      const question = await Question.create({
        ...input,
        createdBy: user.id,
      });

      return question;
    },
    updateQuestion: async (_, { id, input }, context) => {
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
      
      const question = await Question.findByIdAndUpdate(id, input, { new: true });
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      return question.populate('createdBy');
    },
    deleteQuestion: async (_, { id }, context) => {
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN', 'EDITOR']);
      
      const result = await Question.findByIdAndDelete(id);
      if (!result) {
        throw new NotFoundError('Question not found');
      }
      return true;
    },
    changeUserRole: async (_, { userId, newRole }, context) => {
      await checkPermission(context, ['SUPER_ADMIN', 'ADMIN']);
      
      if (newRole === 'SUPER_ADMIN') {
        throw new ForbiddenError('Cannot change role to SUPER_ADMIN');
      }
      
      const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true });
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return user;
    },
  },
};

export default resolvers;