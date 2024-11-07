import { gql } from "apollo-server-express";

const questionSchema = gql`
  type SourceReference {
    page: Int!
    chapter: String
    section: String
    paragraph: String
    lines: Lines!
    text: String!
  }

  type Lines {
    start: Int!
    end: Int!
  }

  type TopicReference {
    mainTopic: String!
    subTopics: [String!]!
  }

  type QuestionAnswer {
    text: String!
    isCorrect: Boolean!
    explanation: String
  }

  type QuestionMetadata {
    createdAt: String!
    updatedAt: String!
    createdBy: User!
    lastModifiedBy: User!
    version: Int!
    status: QuestionStatus!
  }

  type QuestionStats {
    timesAnswered: Int!
    correctAnswers: Int!
    averageTimeToAnswer: Float!
    difficultyRating: Float!
  }

  type QuestionFeedback {
    correct: String!
    incorrect: String!
  }

  type Question {
    id: ID!
    prompt: String!
    questionText: String!
    answers: [QuestionAnswer!]!
    difficulty: QuestionDifficulty!
    type: QuestionType!
    topics: TopicReference!
    sourceReferences: [SourceReference!]!
    metadata: QuestionMetadata!
    learningObjectives: [String!]!
    relatedQuestions: [Question]
    stats: QuestionStats
    tags: [String!]!
    hint: String
    points: Int!
    feedback: QuestionFeedback!
  }

  enum QuestionDifficulty {
    basic
    intermediate
    advanced
  }

  enum QuestionType {
    multiple_choice
    true_false
    fill_in_blank
  }

  enum QuestionStatus {
    draft
    review
    active
    archived
  }

  input LinesInput {
    start: Int!
    end: Int!
  }

  input SourceReferenceInput {
    page: Int!
    chapter: String
    section: String
    paragraph: String
    lines: LinesInput!
    text: String!
  }

  input TopicReferenceInput {
    mainTopic: String!
    subTopics: [String!]!
  }

  input QuestionAnswerInput {
    text: String!
    isCorrect: Boolean!
    explanation: String
  }

  input QuestionFeedbackInput {
    correct: String!
    incorrect: String!
  }

  input CreateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [QuestionAnswerInput!]!
    difficulty: QuestionDifficulty!
    type: QuestionType!
    topics: TopicReferenceInput!
    sourceReferences: [SourceReferenceInput!]!
    learningObjectives: [String!]!
    relatedQuestions: [ID]
    tags: [String!]!
    hint: String
    points: Int
    feedback: QuestionFeedbackInput!
  }

  input UpdateQuestionInput {
    prompt: String
    questionText: String
    answers: [QuestionAnswerInput!]
    difficulty: QuestionDifficulty
    type: QuestionType
    topics: TopicReferenceInput
    sourceReferences: [SourceReferenceInput!]
    learningObjectives: [String!]
    relatedQuestions: [ID]
    tags: [String!]
    hint: String
    points: Int
    feedback: QuestionFeedbackInput
    status: QuestionStatus
  }

  extend type Query {
    questions(
      difficulty: QuestionDifficulty
      type: QuestionType
      status: QuestionStatus
      mainTopic: String
      tags: [String!]
    ): [Question!]!
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
