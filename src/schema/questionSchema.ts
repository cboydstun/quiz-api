import { gql } from 'apollo-server-express';

const questionSchema = gql`
  type Question {
    id: ID!
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    createdBy: User!
  }

  input CreateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
  }

  input UpdateQuestionInput {
    prompt: String
    questionText: String
    answers: [String!]
    correctAnswer: String
    hint: String
  }

  extend type Query {
    questions: [Question!]!
    question(id: ID!): Question!
    userResponses: [UserResponse!]!
  }

  extend type Mutation {
    createQuestion(input: CreateQuestionInput!): Question!
    updateQuestion(id: ID!, input: UpdateQuestionInput!): Question!
    deleteQuestion(id: ID!): Boolean!
    submitAnswer(questionId: ID!, selectedAnswer: String!): AnswerResponse!
  }
`;

export default questionSchema;