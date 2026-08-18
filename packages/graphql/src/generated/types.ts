import { GraphQLResolveInfo } from 'graphql';
import { UserModel, QuestionModel } from '../models';
import { GraphQLContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AnswerInput = {
  questionId: Scalars['ID']['input'];
  selectedAnswer: Scalars['String']['input'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type CreateQuestionInput = {
  answers: Array<Scalars['String']['input']>;
  correctAnswer: Scalars['String']['input'];
  domain?: InputMaybe<Scalars['String']['input']>;
  explanation?: InputMaybe<Scalars['String']['input']>;
  hint?: InputMaybe<Scalars['String']['input']>;
  points?: InputMaybe<Scalars['Int']['input']>;
  prompt: Scalars['String']['input'];
  questionText: Scalars['String']['input'];
};

export type CreateUserInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  /**
   * Honoured only for callers who are already an ADMIN or SUPER_ADMIN. Public
   * self-registration is always forced to USER.
   */
  role?: InputMaybe<Role>;
  username: Scalars['String']['input'];
};

/**
 * The day's route. Everyone gets the same one, derived from the UTC date, so
 * that comparing runs means something. Fewer than eight legs when the bank has
 * fewer than eight classified domains.
 */
export type DailyTrail = {
  __typename?: 'DailyTrail';
  /** The UTC calendar day this route belongs to, YYYY-MM-DD. */
  date: Scalars['String']['output'];
  legs: Array<TrailLeg>;
  /**
   * The day's job, briefed before launch — one entry per line of transmission.
   * Present even when there are no legs to fly.
   */
  mission: Array<Scalars['String']['output']>;
};

/**
 * One row per domain the user has answered in. The answered count is
 * submissions, not distinct questions — a question answered twice counts
 * twice, because user_responses has no uniqueness constraint on
 * (user, question).
 */
export type DomainAccuracy = {
  __typename?: 'DomainAccuracy';
  /** correct / answered, 0-100, rounded to one decimal place. */
  accuracy: Scalars['Float']['output'];
  answered: Scalars['Int']['output'];
  correct: Scalars['Int']['output'];
  domain: Scalars['String']['output'];
};

export type GoogleAuthUrl = {
  __typename?: 'GoogleAuthUrl';
  url: Scalars['String']['output'];
};

export type GradedAnswer = {
  __typename?: 'GradedAnswer';
  correctAnswer: Scalars['String']['output'];
  explanation?: Maybe<Scalars['String']['output']>;
  isCorrect: Scalars['Boolean']['output'];
  questionId: Scalars['ID']['output'];
};

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  position: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  user: LeaderboardUser;
};

/**
 * ALL_TIME ranks the stored score, which carries the history imported from the
 * old backend. The windowed periods are computed from answer history instead of
 * the daily/monthly/yearly point columns: nothing ever wrote those, and a
 * counter that needs a scheduled reset to mean anything is a second thing to
 * get wrong. Windowed boards therefore only know about answers recorded since
 * the cutover, which is the truth rather than a flattering approximation.
 */
export type LeaderboardPeriod =
  | 'ALL_TIME'
  | 'DAILY'
  | 'MONTHLY'
  | 'WEEKLY';

export type LeaderboardResponse = {
  __typename?: 'LeaderboardResponse';
  /** The viewer's position in the full ranking, not just within the returned page. */
  currentUserEntry?: Maybe<LeaderboardEntry>;
  leaderboard: Array<LeaderboardEntry>;
};

/**
 * Deliberately not the User type. getLeaderboard is public, so this is the
 * projection of a user that an anonymous visitor is allowed to see — carrying
 * no address of any kind. Keeping it separate means a field added to User can
 * never reach an unauthenticated caller by accident.
 */
export type LeaderboardUser = {
  __typename?: 'LeaderboardUser';
  id: Scalars['ID']['output'];
  score: Scalars['Int']['output'];
  /**
   * The same stand-in as User.username for a user who has not chosen a name,
   * derived from their id — so it is stable across rank changes and identical
   * on every period's board.
   */
  username: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  authenticateWithGoogle: AuthPayload;
  changeUserRole: User;
  createQuestion: Question;
  deleteQuestion: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  /**
   * Grades a run without recording it. Public, and writes nothing: it exists so
   * a signed-out visitor can finish the run the landing page promised and see a
   * real score. Signed-in runs go through submitAnswer, which is what counts
   * towards stats and the leaderboard.
   */
  gradeAnswers: Array<GradedAnswer>;
  login: AuthPayload;
  /**
   * Records a flash-card verdict.
   *
   * Writes a response row, so a deck worked through feeds domain accuracy and
   * the streak instead of evaporating on refresh — but awards no points. A card
   * you flipped over until you knew it is not the same evidence as answering it
   * cold, and the leaderboard ranks runs.
   */
  recordReview: SubmitAnswerResponse;
  /**
   * Records the outcome of a trail run. Signed-in only — a signed-out run is
   * graded and thrown away, exactly as on /quiz.
   *
   * The first attempt of the day wins: a second call for the same date returns
   * the run already stored rather than overwriting it, so a refresh, a retry,
   * or a double-click cannot rewrite history.
   *
   * The figures are reported by the client and deliberately not verified. What
   * counts — points, score, domain accuracy — comes from submitAnswer on the
   * server; this row only decides that the day is spent.
   */
  recordTrailRun: TrailRun;
  register: AuthPayload;
  submitAnswer: SubmitAnswerResponse;
  updateLoginStreak: User;
  updatePassword: UpdatePasswordResponse;
  updateQuestion: Question;
  updateUsername: User;
};


export type MutationAuthenticateWithGoogleArgs = {
  code: Scalars['String']['input'];
};


export type MutationChangeUserRoleArgs = {
  newRole: Role;
  userId: Scalars['ID']['input'];
};


export type MutationCreateQuestionArgs = {
  input: CreateQuestionInput;
};


export type MutationDeleteQuestionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationGradeAnswersArgs = {
  answers: Array<AnswerInput>;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRecordReviewArgs = {
  known: Scalars['Boolean']['input'];
  questionId: Scalars['ID']['input'];
};


export type MutationRecordTrailRunArgs = {
  input: RecordTrailRunInput;
};


export type MutationRegisterArgs = {
  input: CreateUserInput;
};


export type MutationSubmitAnswerArgs = {
  questionId: Scalars['ID']['input'];
  selectedAnswer: Scalars['String']['input'];
};


export type MutationUpdateLoginStreakArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUpdatePasswordArgs = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationUpdateQuestionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateQuestionInput;
};


export type MutationUpdateUsernameArgs = {
  username: Scalars['String']['input'];
};

/**
 * A question published as reference content on /practice/[domain]. Carries the
 * answer and the explanation because the whole purpose is to be readable — and
 * indexable — without an account. Separate from RunQuestion so that serving a
 * study page can never be confused with serving an unattempted run.
 */
export type PublishedQuestion = {
  __typename?: 'PublishedQuestion';
  answers: Array<Scalars['String']['output']>;
  correctAnswer: Scalars['String']['output'];
  domain?: Maybe<Scalars['String']['output']>;
  explanation?: Maybe<Scalars['String']['output']>;
  hint?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  questionText: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /**
   * Today's trail route, with the questions for every leg.
   *
   * Public for the same reason getLeaderboard is: /trail has no route guard on
   * the client, so requiring a token would bounce every anonymous visitor to
   * /login through the error link — and an anonymous visitor flying the trail
   * and hitting the wall at the end is the whole acquisition path.
   */
  dailyTrail: DailyTrail;
  getGoogleAuthUrl: GoogleAuthUrl;
  getLeaderboard: LeaderboardResponse;
  me?: Maybe<User>;
  /**
   * The viewer's run on today's trail, or null if they have not flown it.
   *
   * This is what makes the day spent: the client refuses to start a run when
   * this is non-null, and the unique index refuses to record a second one.
   */
  myTrailRun?: Maybe<TrailRun>;
  /**
   * Questions published as study content for one domain, with answers and
   * explanations. Public and stable in order — these back server-rendered pages
   * that search engines crawl, and a random order would make every crawl look
   * like a different page.
   */
  publishedQuestions: Array<PublishedQuestion>;
  question?: Maybe<Question>;
  /** How many questions the bank holds, optionally within one domain. Public. */
  questionCount: Scalars['Int']['output'];
  /**
   * Every distinct domain present in the bank, sorted. Nulls omitted.
   *
   * Public: it is the index of the published study pages, and requiring a token
   * to list them would leave nothing to link to.
   */
  questionDomains: Array<Scalars['String']['output']>;
  /**
   * Optionally narrowed to a single domain. Unclassified questions are only
   * returned when no domain is given.
   *
   * limit defaults to 500 and is capped at 500; offset pages through the rest.
   * The bank is small today, but this is the query the management table and the
   * flash-card deck both run, and neither should grow a payload without bound.
   */
  questions: Array<Question>;
  /**
   * A run's worth of questions, in random order, without the answer key.
   *
   * Public on purpose: the landing page offers a ten-item run with no account,
   * and the questions query requires a token. Random rather than the bank's own
   * order, because a fixed order means every visitor — and every repeat run —
   * sees the same items. limit is clamped to 1-200.
   */
  sampleQuestions: Array<RunQuestion>;
  user?: Maybe<User>;
  /** How many accounts exist. Public — the landing page counts operators. */
  userCount: Scalars['Int']['output'];
  /** limit defaults to 200 and is capped at 200; offset pages through the rest. */
  users: Array<User>;
};


export type QueryGetLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  period?: InputMaybe<LeaderboardPeriod>;
};


export type QueryPublishedQuestionsArgs = {
  domain: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQuestionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryQuestionCountArgs = {
  domain?: InputMaybe<Scalars['String']['input']>;
};


export type QueryQuestionsArgs = {
  domain?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySampleQuestionsArgs = {
  domain?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type Question = {
  __typename?: 'Question';
  answers: Array<Scalars['String']['output']>;
  /**
   * The answer key. Available on a single question — flash cards need the back
   * of the card — but refused for a signed-in non-editor asking for the whole
   * list at once, which is the shape a bulk export takes.
   */
  correctAnswer: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: User;
  /**
   * Part 107 subject area, e.g. "Regulations". Null for questions that predate
   * classification; those are excluded from User.domainAccuracy.
   */
  domain?: Maybe<Scalars['String']['output']>;
  /** Shown after grading. Null for questions that predate the column. */
  explanation?: Maybe<Scalars['String']['output']>;
  /** Offered before answering, so it must never give the answer away. */
  hint?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  points: Scalars['Int']['output'];
  prompt: Scalars['String']['output'];
  questionText: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type RecordTrailRunInput = {
  airframeLeft: Scalars['Int']['input'];
  batteryLeft: Scalars['Int']['input'];
  completed: Scalars['Boolean']['input'];
  correct: Scalars['Int']['input'];
  legsReached: Scalars['Int']['input'];
  total: Scalars['Int']['input'];
  /** Must be today or yesterday in UTC — a run that crossed midnight still counts. */
  trailDate: Scalars['String']['input'];
};

export type Role =
  | 'ADMIN'
  | 'EDITOR'
  | 'SUPER_ADMIN'
  | 'USER';

/**
 * A question as served for a run. Deliberately not the Question type: that one
 * carries correctAnswer, and this is the only question shape an anonymous
 * visitor can reach. Grading happens server-side either way, so nothing that
 * plays a run has any need for the answer key.
 */
export type RunQuestion = {
  __typename?: 'RunQuestion';
  answers: Array<Scalars['String']['output']>;
  domain?: Maybe<Scalars['String']['output']>;
  hint?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  points: Scalars['Int']['output'];
  prompt: Scalars['String']['output'];
  questionText: Scalars['String']['output'];
};

export type SubmitAnswerResponse = {
  __typename?: 'SubmitAnswerResponse';
  /**
   * Returned once the answer is in. Revealing it here rather than on the
   * Question type is the point: a run can show what the right answer was
   * without the answer key ever being fetchable ahead of the attempt.
   */
  correctAnswer: Scalars['String']['output'];
  /** Why that answer is correct. Null for questions that predate the column. */
  explanation?: Maybe<Scalars['String']['output']>;
  isCorrect: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

/**
 * One leg of the daily trail: a knowledge domain dressed as terrain, plus the
 * questions that stand between you and the next leg. Carries RunQuestion rather
 * than Question — the trail is a run, and no answer key leaves the server ahead
 * of an attempt.
 */
export type TrailLeg = {
  __typename?: 'TrailLeg';
  /**
   * The crossing beat, one entry per line of transmission. Dealt by the same
   * date seed as the route, so two operators flying today read the same thing.
   * Describes the crossing, never the outcome — the instruments carry what a
   * miss cost.
   */
  dispatch: Array<Scalars['String']['output']>;
  domain: Scalars['String']['output'];
  /** Hazard legs damage the airframe on a miss. Ordinary legs only cost battery. */
  hazard: Scalars['Boolean']['output'];
  /** 1-based, as displayed: LEG 3 OF 8. */
  index: Scalars['Int']['output'];
  questions: Array<RunQuestion>;
  /** The domain's terrain name, e.g. ICING LAYER for Weather sources. */
  terrain: Scalars['String']['output'];
};

/**
 * An operator's outcome on one day's trail. One per operator per day — the
 * attempt is spent whether you arrived or went down.
 *
 * The answers are not here: a signed-in run submits each question through
 * submitAnswer, so points and domain accuracy move on the existing path. This
 * is only the run's shape.
 */
export type TrailRun = {
  __typename?: 'TrailRun';
  airframeLeft: Scalars['Int']['output'];
  batteryLeft: Scalars['Int']['output'];
  completed: Scalars['Boolean']['output'];
  correct: Scalars['Int']['output'];
  legsReached: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  trailDate: Scalars['String']['output'];
};

export type UpdatePasswordResponse = {
  __typename?: 'UpdatePasswordResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateQuestionInput = {
  answers: Array<Scalars['String']['input']>;
  correctAnswer: Scalars['String']['input'];
  domain?: InputMaybe<Scalars['String']['input']>;
  explanation?: InputMaybe<Scalars['String']['input']>;
  hint?: InputMaybe<Scalars['String']['input']>;
  points?: InputMaybe<Scalars['Int']['input']>;
  prompt: Scalars['String']['input'];
  questionText: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  consecutiveLoginDays: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  dailyPoints: Scalars['Int']['output'];
  /**
   * Accuracy per question domain, from this user's answer history. Readable
   * only by the user themselves or an admin. Questions with no domain are
   * excluded, so an unclassified bank yields an empty list.
   */
  domainAccuracy: Array<DomainAccuracy>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** ISO 8601 string — the frontend formats these with new Date(value). */
  lastLoginDate?: Maybe<Scalars['String']['output']>;
  lifetimePoints: Scalars['Int']['output'];
  monthlyPoints: Scalars['Int']['output'];
  questionsAnswered: Scalars['Int']['output'];
  questionsCorrect: Scalars['Int']['output'];
  questionsIncorrect: Scalars['Int']['output'];
  role: Role;
  score: Scalars['Int']['output'];
  skills: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  /**
   * Never null in the API even though the column is nullable. A user who has
   * not chosen one — every Google sign-up, until they call updateUsername —
   * gets a stand-in derived from their id. Never the local part of their
   * email: this field is shown to people other than its owner.
   */
  username: Scalars['String']['output'];
  yearlyPoints: Scalars['Int']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AnswerInput: AnswerInput;
  AuthPayload: ResolverTypeWrapper<Omit<AuthPayload, 'user'> & { user: ResolversTypes['User'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateQuestionInput: CreateQuestionInput;
  CreateUserInput: CreateUserInput;
  DailyTrail: ResolverTypeWrapper<DailyTrail>;
  DomainAccuracy: ResolverTypeWrapper<DomainAccuracy>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GoogleAuthUrl: ResolverTypeWrapper<GoogleAuthUrl>;
  GradedAnswer: ResolverTypeWrapper<GradedAnswer>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  LeaderboardEntry: ResolverTypeWrapper<LeaderboardEntry>;
  LeaderboardPeriod: LeaderboardPeriod;
  LeaderboardResponse: ResolverTypeWrapper<LeaderboardResponse>;
  LeaderboardUser: ResolverTypeWrapper<LeaderboardUser>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PublishedQuestion: ResolverTypeWrapper<PublishedQuestion>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Question: ResolverTypeWrapper<QuestionModel>;
  RecordTrailRunInput: RecordTrailRunInput;
  Role: Role;
  RunQuestion: ResolverTypeWrapper<RunQuestion>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubmitAnswerResponse: ResolverTypeWrapper<SubmitAnswerResponse>;
  TrailLeg: ResolverTypeWrapper<TrailLeg>;
  TrailRun: ResolverTypeWrapper<TrailRun>;
  UpdatePasswordResponse: ResolverTypeWrapper<UpdatePasswordResponse>;
  UpdateQuestionInput: UpdateQuestionInput;
  User: ResolverTypeWrapper<UserModel>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AnswerInput: AnswerInput;
  AuthPayload: Omit<AuthPayload, 'user'> & { user: ResolversParentTypes['User'] };
  Boolean: Scalars['Boolean']['output'];
  CreateQuestionInput: CreateQuestionInput;
  CreateUserInput: CreateUserInput;
  DailyTrail: DailyTrail;
  DomainAccuracy: DomainAccuracy;
  Float: Scalars['Float']['output'];
  GoogleAuthUrl: GoogleAuthUrl;
  GradedAnswer: GradedAnswer;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  LeaderboardEntry: LeaderboardEntry;
  LeaderboardResponse: LeaderboardResponse;
  LeaderboardUser: LeaderboardUser;
  Mutation: Record<PropertyKey, never>;
  PublishedQuestion: PublishedQuestion;
  Query: Record<PropertyKey, never>;
  Question: QuestionModel;
  RecordTrailRunInput: RecordTrailRunInput;
  RunQuestion: RunQuestion;
  String: Scalars['String']['output'];
  SubmitAnswerResponse: SubmitAnswerResponse;
  TrailLeg: TrailLeg;
  TrailRun: TrailRun;
  UpdatePasswordResponse: UpdatePasswordResponse;
  UpdateQuestionInput: UpdateQuestionInput;
  User: UserModel;
}>;

export type AuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type DailyTrailResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DailyTrail'] = ResolversParentTypes['DailyTrail']> = ResolversObject<{
  date?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  legs?: Resolver<Array<ResolversTypes['TrailLeg']>, ParentType, ContextType>;
  mission?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type DomainAccuracyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DomainAccuracy'] = ResolversParentTypes['DomainAccuracy']> = ResolversObject<{
  accuracy?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  answered?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type GoogleAuthUrlResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GoogleAuthUrl'] = ResolversParentTypes['GoogleAuthUrl']> = ResolversObject<{
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type GradedAnswerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GradedAnswer'] = ResolversParentTypes['GradedAnswer']> = ResolversObject<{
  correctAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isCorrect?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  questionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type LeaderboardEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LeaderboardEntry'] = ResolversParentTypes['LeaderboardEntry']> = ResolversObject<{
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['LeaderboardUser'], ParentType, ContextType>;
}>;

export type LeaderboardResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LeaderboardResponse'] = ResolversParentTypes['LeaderboardResponse']> = ResolversObject<{
  currentUserEntry?: Resolver<Maybe<ResolversTypes['LeaderboardEntry']>, ParentType, ContextType>;
  leaderboard?: Resolver<Array<ResolversTypes['LeaderboardEntry']>, ParentType, ContextType>;
}>;

export type LeaderboardUserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LeaderboardUser'] = ResolversParentTypes['LeaderboardUser']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  authenticateWithGoogle?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationAuthenticateWithGoogleArgs, 'code'>>;
  changeUserRole?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationChangeUserRoleArgs, 'newRole' | 'userId'>>;
  createQuestion?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<MutationCreateQuestionArgs, 'input'>>;
  deleteQuestion?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteQuestionArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'userId'>>;
  gradeAnswers?: Resolver<Array<ResolversTypes['GradedAnswer']>, ParentType, ContextType, RequireFields<MutationGradeAnswersArgs, 'answers'>>;
  login?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'email' | 'password'>>;
  recordReview?: Resolver<ResolversTypes['SubmitAnswerResponse'], ParentType, ContextType, RequireFields<MutationRecordReviewArgs, 'known' | 'questionId'>>;
  recordTrailRun?: Resolver<ResolversTypes['TrailRun'], ParentType, ContextType, RequireFields<MutationRecordTrailRunArgs, 'input'>>;
  register?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRegisterArgs, 'input'>>;
  submitAnswer?: Resolver<ResolversTypes['SubmitAnswerResponse'], ParentType, ContextType, RequireFields<MutationSubmitAnswerArgs, 'questionId' | 'selectedAnswer'>>;
  updateLoginStreak?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateLoginStreakArgs, 'userId'>>;
  updatePassword?: Resolver<ResolversTypes['UpdatePasswordResponse'], ParentType, ContextType, RequireFields<MutationUpdatePasswordArgs, 'currentPassword' | 'newPassword'>>;
  updateQuestion?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<MutationUpdateQuestionArgs, 'id' | 'input'>>;
  updateUsername?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUsernameArgs, 'username'>>;
}>;

export type PublishedQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PublishedQuestion'] = ResolversParentTypes['PublishedQuestion']> = ResolversObject<{
  answers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  correctAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hint?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  dailyTrail?: Resolver<ResolversTypes['DailyTrail'], ParentType, ContextType>;
  getGoogleAuthUrl?: Resolver<ResolversTypes['GoogleAuthUrl'], ParentType, ContextType>;
  getLeaderboard?: Resolver<ResolversTypes['LeaderboardResponse'], ParentType, ContextType, Partial<QueryGetLeaderboardArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  myTrailRun?: Resolver<Maybe<ResolversTypes['TrailRun']>, ParentType, ContextType>;
  publishedQuestions?: Resolver<Array<ResolversTypes['PublishedQuestion']>, ParentType, ContextType, RequireFields<QueryPublishedQuestionsArgs, 'domain'>>;
  question?: Resolver<Maybe<ResolversTypes['Question']>, ParentType, ContextType, RequireFields<QueryQuestionArgs, 'id'>>;
  questionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType, Partial<QueryQuestionCountArgs>>;
  questionDomains?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType, Partial<QueryQuestionsArgs>>;
  sampleQuestions?: Resolver<Array<ResolversTypes['RunQuestion']>, ParentType, ContextType, Partial<QuerySampleQuestionsArgs>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  userCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryUsersArgs>>;
}>;

export type QuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question']> = ResolversObject<{
  answers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  correctAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hint?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  prompt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RunQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RunQuestion'] = ResolversParentTypes['RunQuestion']> = ResolversObject<{
  answers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hint?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  prompt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SubmitAnswerResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubmitAnswerResponse'] = ResolversParentTypes['SubmitAnswerResponse']> = ResolversObject<{
  correctAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isCorrect?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type TrailLegResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TrailLeg'] = ResolversParentTypes['TrailLeg']> = ResolversObject<{
  dispatch?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hazard?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['RunQuestion']>, ParentType, ContextType>;
  terrain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type TrailRunResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TrailRun'] = ResolversParentTypes['TrailRun']> = ResolversObject<{
  airframeLeft?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  batteryLeft?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  correct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  legsReached?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trailDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UpdatePasswordResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UpdatePasswordResponse'] = ResolversParentTypes['UpdatePasswordResponse']> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  consecutiveLoginDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dailyPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  domainAccuracy?: Resolver<Array<ResolversTypes['DomainAccuracy']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastLoginDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lifetimePoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  monthlyPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionsAnswered?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionsCorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionsIncorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skills?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  yearlyPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  DailyTrail?: DailyTrailResolvers<ContextType>;
  DomainAccuracy?: DomainAccuracyResolvers<ContextType>;
  GoogleAuthUrl?: GoogleAuthUrlResolvers<ContextType>;
  GradedAnswer?: GradedAnswerResolvers<ContextType>;
  LeaderboardEntry?: LeaderboardEntryResolvers<ContextType>;
  LeaderboardResponse?: LeaderboardResponseResolvers<ContextType>;
  LeaderboardUser?: LeaderboardUserResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PublishedQuestion?: PublishedQuestionResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  RunQuestion?: RunQuestionResolvers<ContextType>;
  SubmitAnswerResponse?: SubmitAnswerResponseResolvers<ContextType>;
  TrailLeg?: TrailLegResolvers<ContextType>;
  TrailRun?: TrailRunResolvers<ContextType>;
  UpdatePasswordResponse?: UpdatePasswordResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

