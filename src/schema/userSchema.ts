// src/schema/userSchema.ts

import { gql } from "apollo-server-express";

const userSchema = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
    score: Int
    questionsAnswered: Int
    questionsCorrect: Int
    questionsIncorrect: Int
    skills: [String]
    lifetimePoints: Int
    yearlyPoints: Int
    monthlyPoints: Int
    dailyPoints: Int
    consecutiveLoginDays: Int
    lastLoginDate: String
    createdAt: String
    updatedAt: String
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    role: Role
  }

  input UserStatsInput {
    questionsAnswered: Int
    questionsCorrect: Int
    questionsIncorrect: Int
    pointsEarned: Int
    newSkills: [String]
    consecutiveLoginDays: Int
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
    updateUserStats(userId: ID!, stats: UserStatsInput!): User!
  }
`;

export default userSchema;
