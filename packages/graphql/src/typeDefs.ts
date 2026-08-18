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
    Never null in the API even though the column is nullable. A user who has
    not chosen one — every Google sign-up, until they call updateUsername —
    gets a stand-in derived from their id. Never the local part of their
    email: this field is shown to people other than its owner.
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
    """
    The answer key. Available on a single question — flash cards need the back
    of the card — but refused for a signed-in non-editor asking for the whole
    list at once, which is the shape a bulk export takes.
    """
    correctAnswer: String!
    "Offered before answering, so it must never give the answer away."
    hint: String
    "Shown after grading. Null for questions that predate the column."
    explanation: String
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
    """
    Returned once the answer is in. Revealing it here rather than on the
    Question type is the point: a run can show what the right answer was
    without the answer key ever being fetchable ahead of the attempt.
    """
    correctAnswer: String!
    "Why that answer is correct. Null for questions that predate the column."
    explanation: String
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

  """
  A question published as reference content on /practice/[domain]. Carries the
  answer and the explanation because the whole purpose is to be readable — and
  indexable — without an account. Separate from RunQuestion so that serving a
  study page can never be confused with serving an unattempted run.
  """
  type PublishedQuestion {
    id: ID!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    explanation: String
    hint: String
    domain: String
  }

  """
  One leg of the daily trail: a knowledge domain dressed as terrain, plus the
  questions that stand between you and the next leg. Carries RunQuestion rather
  than Question — the trail is a run, and no answer key leaves the server ahead
  of an attempt.
  """
  type TrailLeg {
    "1-based, as displayed: LEG 3 OF 8."
    index: Int!
    domain: String!
    "The domain's terrain name, e.g. ICING LAYER for Weather sources."
    terrain: String!
    "Hazard legs damage the airframe on a miss. Ordinary legs only cost battery."
    hazard: Boolean!
    """
    The crossing beat, one entry per line of transmission. Dealt by the same
    date seed as the route, so two operators flying today read the same thing.
    Describes the crossing, never the outcome — the instruments carry what a
    miss cost.
    """
    dispatch: [String!]!
    questions: [RunQuestion!]!
  }

  """
  The day's route. Everyone gets the same one, derived from the UTC date, so
  that comparing runs means something. Fewer than eight legs when the bank has
  fewer than eight classified domains.
  """
  type DailyTrail {
    "The UTC calendar day this route belongs to, YYYY-MM-DD."
    date: String!
    """
    The day's job, briefed before launch — one entry per line of transmission.
    Present even when there are no legs to fly.
    """
    mission: [String!]!
    legs: [TrailLeg!]!
  }

  """
  An operator's outcome on one day's trail. One per operator per day — the
  attempt is spent whether you arrived or went down.

  The answers are not here: a signed-in run submits each question through
  submitAnswer, so points and domain accuracy move on the existing path. This
  is only the run's shape.
  """
  type TrailRun {
    trailDate: String!
    legsReached: Int!
    completed: Boolean!
    batteryLeft: Int!
    airframeLeft: Int!
    correct: Int!
    total: Int!
  }

  input RecordTrailRunInput {
    "Must be today or yesterday in UTC — a run that crossed midnight still counts."
    trailDate: String!
    legsReached: Int!
    completed: Boolean!
    batteryLeft: Int!
    airframeLeft: Int!
    correct: Int!
    total: Int!
  }

  input AnswerInput {
    questionId: ID!
    selectedAnswer: String!
  }

  type GradedAnswer {
    questionId: ID!
    isCorrect: Boolean!
    correctAnswer: String!
    explanation: String
  }

  type UpdatePasswordResponse {
    success: Boolean!
    message: String!
  }

  """
  Deliberately not the User type. getLeaderboard is public, so this is the
  projection of a user that an anonymous visitor is allowed to see — carrying
  no address of any kind. Keeping it separate means a field added to User can
  never reach an unauthenticated caller by accident.
  """
  type LeaderboardUser {
    id: ID!
    """
    The same stand-in as User.username for a user who has not chosen a name,
    derived from their id — so it is stable across rank changes and identical
    on every period's board.
    """
    username: String!
    score: Int!
  }

  """
  ALL_TIME ranks the stored score, which carries the history imported from the
  old backend. The windowed periods are computed from answer history instead of
  the daily/monthly/yearly point columns: nothing ever wrote those, and a
  counter that needs a scheduled reset to mean anything is a second thing to
  get wrong. Windowed boards therefore only know about answers recorded since
  the cutover, which is the truth rather than a flattering approximation.
  """
  enum LeaderboardPeriod {
    ALL_TIME
    DAILY
    WEEKLY
    MONTHLY
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
    explanation: String
    points: Int
    domain: String
  }

  input UpdateQuestionInput {
    prompt: String!
    questionText: String!
    answers: [String!]!
    correctAnswer: String!
    hint: String
    explanation: String
    points: Int
    domain: String
  }

  type Query {
    me: User
    "limit defaults to 200 and is capped at 200; offset pages through the rest."
    users(limit: Int, offset: Int): [User!]!
    user(id: ID!): User
    "How many accounts exist. Public — the landing page counts operators."
    userCount: Int!
    """
    Optionally narrowed to a single domain. Unclassified questions are only
    returned when no domain is given.

    limit defaults to 500 and is capped at 500; offset pages through the rest.
    The bank is small today, but this is the query the management table and the
    flash-card deck both run, and neither should grow a payload without bound.
    """
    questions(domain: String, limit: Int, offset: Int): [Question!]!
    "How many questions the bank holds, optionally within one domain. Public."
    questionCount(domain: String): Int!
    question(id: ID!): Question
    """
    A run's worth of questions, in random order, without the answer key.

    Public on purpose: the landing page offers a ten-item run with no account,
    and the questions query requires a token. Random rather than the bank's own
    order, because a fixed order means every visitor — and every repeat run —
    sees the same items. limit is clamped to 1-200.
    """
    sampleQuestions(limit: Int, domain: String): [RunQuestion!]!
    """
    Questions published as study content for one domain, with answers and
    explanations. Public and stable in order — these back server-rendered pages
    that search engines crawl, and a random order would make every crawl look
    like a different page.
    """
    publishedQuestions(domain: String!, limit: Int): [PublishedQuestion!]!
    """
    Every distinct domain present in the bank, sorted. Nulls omitted.

    Public: it is the index of the published study pages, and requiring a token
    to list them would leave nothing to link to.
    """
    questionDomains: [String!]!
    """
    Today's trail route, with the questions for every leg.

    Public for the same reason getLeaderboard is: /trail has no route guard on
    the client, so requiring a token would bounce every anonymous visitor to
    /login through the error link — and an anonymous visitor flying the trail
    and hitting the wall at the end is the whole acquisition path.
    """
    dailyTrail: DailyTrail!
    """
    The viewer's run on today's trail, or null if they have not flown it.

    This is what makes the day spent: the client refuses to start a run when
    this is non-null, and the unique index refuses to record a second one.
    """
    myTrailRun: TrailRun
    getGoogleAuthUrl: GoogleAuthUrl!
    getLeaderboard(limit: Int, period: LeaderboardPeriod): LeaderboardResponse!
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

    """
    Records a flash-card verdict.

    Writes a response row, so a deck worked through feeds domain accuracy and
    the streak instead of evaporating on refresh — but awards no points. A card
    you flipped over until you knew it is not the same evidence as answering it
    cold, and the leaderboard ranks runs.
    """
    recordReview(questionId: ID!, known: Boolean!): SubmitAnswerResponse!

    """
    Records the outcome of a trail run. Signed-in only — a signed-out run is
    graded and thrown away, exactly as on /quiz.

    The first attempt of the day wins: a second call for the same date returns
    the run already stored rather than overwriting it, so a refresh, a retry,
    or a double-click cannot rewrite history.

    The figures are reported by the client and deliberately not verified. What
    counts — points, score, domain accuracy — comes from submitAnswer on the
    server; this row only decides that the day is spent.
    """
    recordTrailRun(input: RecordTrailRunInput!): TrailRun!

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
