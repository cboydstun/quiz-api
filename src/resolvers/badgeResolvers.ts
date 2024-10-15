import { IResolvers } from '@graphql-tools/utils';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import Badge from '../models/Badge';
import User from '../models/User';
import { checkAuth } from '../utils/auth';

const badgeResolvers: IResolvers = {
    Query: {
        badges: async (_, __, { req }) => {
            checkAuth(req);
            return await Badge.find();
        },
        badge: async (_, { id }, { req }) => {
            checkAuth(req);
            const badge = await Badge.findById(id);
            if (!badge) {
                throw new UserInputError('Badge not found');
            }
            return badge;
        },
    },
    Mutation: {
        createBadge: async (_, { name, description, imageUrl }, { req }) => {
            const user = checkAuth(req);
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                throw new AuthenticationError('Not authorized to create badges');
            }
            const newBadge = new Badge({ name, description, imageUrl });
            return await newBadge.save();
        },
        issueBadgeToUser: async (_, { badgeId, userId }, { req }) => {
            const adminUser = checkAuth(req);
            if (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
                throw new AuthenticationError('Not authorized to issue badges');
            }
            const badge = await Badge.findById(badgeId);
            if (!badge) {
                throw new UserInputError('Badge not found');
            }
            const user = await User.findById(userId);
            if (!user) {
                throw new UserInputError('User not found');
            }
            if (user.badges.includes(badgeId)) {
                throw new UserInputError('User already has this badge');
            }
            user.badges.push(badgeId);
            await user.save();
            return user;
        },
    },
};

export default badgeResolvers;
