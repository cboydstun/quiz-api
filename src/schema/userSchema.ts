// src/schema/userSchema.ts

import { gql } from 'apollo-server-express';

const userSchema = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    role: Role
  }

  extend type Query {
    me: User!
    user(id: ID!): User!
    users: [User!]!
  }

  extend type Mutation {
    register(input: CreateUserInput!): AuthPayload!
    changeUserRole(userId: ID!, newRole: Role!): User!
    deleteUser(userId: ID!): Boolean!
  }
`;

export default userSchema;
