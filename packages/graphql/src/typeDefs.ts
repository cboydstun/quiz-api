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

    """
    Accuracy per question domain, from this user's answer history. Readable
    only by the user themselves or an admin. Questions with no domain are
    excluded, so an unclassified bank yields an empty list.
    """
    domainAccuracy: [DomainAccuracy!]!

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
    """
    Part 107 subject area, e.g. "Regulations". Null for questions that predate
    classification; those are excluded from User.domainAccuracy.
    """
    domain: String
    createdBy: User!
    createdAt: String!
    updatedAt: String!
  }

  """
  One row per domain the user has answered in. The answered count is
  submissions, not distinct questions — a question answered twice counts
  twice, because user_responses has no uniqueness constraint on
  (user, question).
  """
  type DomainAccuracy {
    domain: String!
    answered: Int!
    correct: Int!
    "correct / answered, 0-100, rounded to one decimal place."
    accuracy: Float!
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

  """
  A question as served for a run. Deliberately not the Question type: that one
  carries correctAnswer, and this is the only question shape an anonymous
  visitor can reach. Grading happens server-side either way, so nothing that
  plays a run has any need for the answer key.
  """
  type RunQuestion {
    id: ID!
    prompt: String!
    questionText: String!
    answers: [String!]!
    hint: String
    points: Int!
    domain: String
  }

  input AnswerInput {
    questionId: ID!
    selectedAnswer: String!
  }

  type GradedAnswer {
    questionId: ID!
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
    domain: String
  }

  input UpdateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    points: Int
    domain: String
  }

  type Query {
    me: User
    users: [User!]!
    user(id: ID!): User
    "Optionally narrowed to a single domain. Unclassified questions are only returned when no domain is given."
    questions(domain: String): [Question!]!
    question(id: ID!): Question
    """
    A run's worth of questions, in random order, without the answer key.

    Public on purpose: the landing page offers a ten-item run with no account,
    and the questions query requires a token. Random rather than the bank's own
    order, because a fixed order means every visitor — and every repeat run —
    sees the same items. limit is clamped to 1-200.
    """
    sampleQuestions(limit: Int, domain: String): [RunQuestion!]!
    "Every distinct domain present in the bank, sorted. Nulls omitted."
    questionDomains: [String!]!
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

    """
    Grades a run without recording it. Public, and writes nothing: it exists so
    a signed-out visitor can finish the run the landing page promised and see a
    real score. Signed-in runs go through submitAnswer, which is what counts
    towards stats and the leaderboard.
    """
    gradeAnswers(answers: [AnswerInput!]!): [GradedAnswer!]!

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
