import { IResolvers } from '@graphql-tools/utils';
import userResolvers from "./userResolvers";
import questionResolvers from "./questionResolvers";
import authResolvers from "./authResolvers";
import badgeResolvers from "./badgeResolvers";
import scalarResolvers from "./scalarResolvers";
import { UserResolvers, QuestionResolvers, AuthResolvers, LeaderboardResolvers } from './types';

export const resolvers: IResolvers = {
  ...scalarResolvers,
  Query: {
    ...userResolvers.Query,
    ...questionResolvers.Query,
    ...authResolvers.Query,
    ...badgeResolvers.Query,
  } as UserResolvers['Query'] & QuestionResolvers['Query'] & AuthResolvers['Query'] & LeaderboardResolvers['Query'],
  Mutation: {
    ...userResolvers.Mutation,
    ...questionResolvers.Mutation,
    ...authResolvers.Mutation,
    ...badgeResolvers.Mutation,
  } as UserResolvers['Mutation'] & QuestionResolvers['Mutation'] & AuthResolvers['Mutation'],
};