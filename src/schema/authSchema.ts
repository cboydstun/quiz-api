// src/schema/authSchema.ts

import { gql } from 'apollo-server-express';

const authSchema = gql`
  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Query {
    getGoogleAuthUrl: GoogleAuthUrl!
  }

  extend type Mutation {
    login(email: String!, password: String!): AuthPayload!
    authenticateWithGoogle(code: String!): AuthPayload!
  }
`;

export default authSchema;
