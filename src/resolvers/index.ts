// src/resolvers/index.ts

import userResolvers from "./userResolvers";
import questionResolvers from "./questionResolvers";
import authResolvers from "./authResolvers";
import leaderboardResolvers from "./leaderboardResolvers";

const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...questionResolvers.Query,
    ...authResolvers.Query,
    ...leaderboardResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...questionResolvers.Mutation,
    ...authResolvers.Mutation,
  },
};

export default resolvers;