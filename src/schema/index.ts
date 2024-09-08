// src/schema/index.ts

import { gql } from 'apollo-server-express';

const typeDefs = gql`
  enum Role {
    SUPER_ADMIN
    ADMIN
    EDITOR
    USER
  }

  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  type Question {
    id: ID!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    createdBy: User!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    role: Role
  }

  input CreateQuestionInput {
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
  }

  type Query {
    me: User!
    users: [User!]!
    user(id: ID!): User!
    questions: [Question!]!
    question(id: ID!): Question
  }

  type Mutation {
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createQuestion(input: CreateQuestionInput!): Question!
    updateQuestion(id: ID!, input: CreateQuestionInput!): Question!
    deleteQuestion(id: ID!): Boolean!
    changeUserRole(userId: ID!, newRole: Role!): User!
  }
`;

export default typeDefs;