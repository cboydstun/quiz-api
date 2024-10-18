// src/schema/userSchema.ts

import { gql } from "apollo-server-express";

const userSchema = gql`
  type User {
    id: ID!
    username: String!
    email: String
    role: String!
    score: Int
    questionsAnswered: Int!
    questionsCorrect: Int!
    questionsIncorrect: Int!
    badges: [Badge]
    lifetimePoints: Int
    yearlyPoints: Int
    monthlyPoints: Int
    dailyPoints: Int
    consecutiveLoginDays: Int
    lastLoginDate: Date
    createdAt: Date
    updatedAt: Date
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
    newBadge: BadgeInput
    lifetimePoints: Int
    yearlyPoints: Int
    monthlyPoints: Int
    dailyPoints: Int
    consecutiveLoginDays: Int
    lastLoginDate: Date
  }

  input BadgeInput {
    name: String!
    description: String!
  }

  type UpdateUsernameResponse {
    id: ID!
    username: String!
  }

  type UpdatePasswordResponse {
    success: Boolean!
    message: String!
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
    updateUsername(username: String!): UpdateUsernameResponse!
    updatePassword(
      currentPassword: String!
      newPassword: String!
    ): UpdatePasswordResponse!
    updateLoginStreak(userId: ID!): User!
  }
`;

export default userSchema;
