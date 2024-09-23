// src/schema/types.ts

import { gql } from 'apollo-server-express';

const types = gql`
  enum Role {
    SUPER_ADMIN
    ADMIN
    EDITOR
    USER
  }

  type UserResponse {
    questionId: Question!
    selectedAnswer: String!
    isCorrect: Boolean!
  }

  type AnswerResponse {
    success: Boolean!
    isCorrect: Boolean!
  }

  type GoogleAuthUrl {
    url: String!
  }

  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

export default types;
