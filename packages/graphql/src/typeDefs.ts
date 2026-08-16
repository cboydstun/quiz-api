/**
 * The GraphQL contract, kept as a TypeScript module rather than a .graphql
 * file so it bundles into the Next.js route handler with no loader and no
 * filesystem read at runtime. graphql-codegen reads this same file.
 */
export const typeDefs = /* GraphQL */ `
  # The contract is fixed by the frontend. Every field below is selected by at
  # least one operation in apps/web; nothing here is speculative. When changing
  # this file, grep apps/web for gql template tags and update the hand-written
  # interface next to the operation in the same commit.

  enum Role {
    USER
    EDITOR
    ADMIN
    SUPER_ADMIN
  }

  type User {
    id: ID!
    """
    Never null in the API even though the column is nullable: Google sign-ups
    without a display name fall back to the local part of their email.
    """
    username: String!
    email: String!
    role: Role!

    score: Int!
    questionsAnswered: Int!
    questionsCorrect: Int!
    questionsIncorrect: Int!

    skills: [String!]!

    lifetimePoints: Int!
    yearlyPoints: Int!
    monthlyPoints: Int!
    dailyPoints: Int!

    consecutiveLoginDays: Int!
    "ISO 8601 string — the frontend formats these with new Date(value)."
    lastLoginDate: String
    createdAt: String!
    updatedAt: String!
  }

  type Question {
    id: ID!
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    points: Int!
    createdBy: User!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type GoogleAuthUrl {
    url: String!
  }

  type SubmitAnswerResponse {
    success: Boolean!
    isCorrect: Boolean!
  }

  type UpdatePasswordResponse {
    success: Boolean!
    message: String!
  }

  """
  Deliberately not the User type. Leaderboard emails are masked, and reusing
  It would let a masked email overwrite the real one in Apollo's normalized
  cache the moment both appear in the same session.
  """
  type LeaderboardUser {
    id: ID!
    username: String!
    email: String!
    score: Int!
  }

  type LeaderboardEntry {
    position: Int!
    user: LeaderboardUser!
    score: Int!
  }

  type LeaderboardResponse {
    leaderboard: [LeaderboardEntry!]!
    "The viewer's position in the full ranking, not just within the returned page."
    currentUserEntry: LeaderboardEntry
  }

  input CreateUserInput {
    username: String!
    email: String!
    password: String!
    """
    Honoured only for callers who are already an ADMIN or SUPER_ADMIN. Public
    self-registration is always forced to USER.
    """
    role: Role
  }

  input CreateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    points: Int
  }

  input UpdateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    points: Int
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
    questions: [Question!]!
    question(id: ID!): Question
    getGoogleAuthUrl: GoogleAuthUrl!
    getLeaderboard(limit: Int): LeaderboardResponse!
  }

  type Mutation {
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    authenticateWithGoogle(code: String!): AuthPayload!

    createQuestion(input: CreateQuestionInput!): Question!
    updateQuestion(id: ID!, input: UpdateQuestionInput!): Question!
    deleteQuestion(id: ID!): Boolean!

    submitAnswer(
      questionId: ID!
      selectedAnswer: String!
    ): SubmitAnswerResponse!

    changeUserRole(userId: ID!, newRole: Role!): User!
    deleteUser(userId: ID!): Boolean!

    updateUsername(username: String!): User!
    updatePassword(
      currentPassword: String!
      newPassword: String!
    ): UpdatePasswordResponse!
    updateLoginStreak(userId: ID!): User!
  }
`;
