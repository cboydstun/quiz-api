// src/resolvers/badgeResolvers.ts

import { IResolvers } from '@graphql-tools/utils';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import Badge, { IBadge } from '../models/Badge';
import User from '../models/User';
import { checkAuth } from '../utils/auth';

const badgeResolvers: Pick<IResolvers, 'Query' | 'Mutation'> = {
    Query: {
        badges: async (_, __, context) => {
            checkAuth(context);
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
        createBadge: async (_, { name, description, imageUrl }, context) => {
            const user = checkAuth(context);
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                throw new AuthenticationError('Not authorized to create badges');
            }
            const newBadge = new Badge({ name, description, imageUrl });
            return await newBadge.save();
        },
        issueBadgeToUser: async (_, { badgeId, userId }, context) => {
            const adminUser = checkAuth(context);
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
            if (user.badges.some(b => b._id.toString() === badgeId)) {
                throw new UserInputError('User already has this badge');
            }
            const newBadge: IBadge = {
                _id: badge._id,
                name: badge.name,
                description: badge.description,
                imageUrl: badge.imageUrl,
                earnedAt: new Date(),
                toObject: function () { return this; }
            } as IBadge;
            user.badges.push(newBadge);
            await user.save();
            return user;
        },
    },
};

export default badgeResolvers;
