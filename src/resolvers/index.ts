import userResolvers from "./userResolvers";
import questionResolvers from "./questionResolvers";
import authResolvers from "./authResolvers";

const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...questionResolvers.Query,
    ...authResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...questionResolvers.Mutation,
    ...authResolvers.Mutation,
  },
};

export default resolvers;
