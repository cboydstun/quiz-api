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

export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: User;
};

export type CreateQuestionInput = {
  answers: Array<Scalars['String']['input']>;
  correctAnswer: Scalars['String']['input'];
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

export type GoogleAuthUrl = {
  __typename?: 'GoogleAuthUrl';
  url: Scalars['String']['output'];
};

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  position: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  user: LeaderboardUser;
};

export type LeaderboardResponse = {
  __typename?: 'LeaderboardResponse';
  /** The viewer's position in the full ranking, not just within the returned page. */
  currentUserEntry?: Maybe<LeaderboardEntry>;
  leaderboard: Array<LeaderboardEntry>;
};

/**
 * Deliberately not the User type. Leaderboard emails are masked, and reusing
 * It would let a masked email overwrite the real one in Apollo's normalized
 * cache the moment both appear in the same session.
 */
export type LeaderboardUser = {
  __typename?: 'LeaderboardUser';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  score: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  authenticateWithGoogle: AuthPayload;
  changeUserRole: User;
  createQuestion: Question;
  deleteQuestion: Scalars['Boolean']['output'];
  deleteUser: Scalars['Boolean']['output'];
  login: AuthPayload;
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


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
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

export type Query = {
  __typename?: 'Query';
  getGoogleAuthUrl: GoogleAuthUrl;
  getLeaderboard: LeaderboardResponse;
  me?: Maybe<User>;
  question?: Maybe<Question>;
  questions: Array<Question>;
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryGetLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQuestionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};

export type Question = {
  __typename?: 'Question';
  answers: Array<Scalars['String']['output']>;
  correctAnswer: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: User;
  hint?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  points: Scalars['Int']['output'];
  prompt: Scalars['String']['output'];
  questionText: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Role =
  | 'ADMIN'
  | 'EDITOR'
  | 'SUPER_ADMIN'
  | 'USER';

export type SubmitAnswerResponse = {
  __typename?: 'SubmitAnswerResponse';
  isCorrect: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdatePasswordResponse = {
  __typename?: 'UpdatePasswordResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type UpdateQuestionInput = {
  answers: Array<Scalars['String']['input']>;
  correctAnswer: Scalars['String']['input'];
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
   * Never null in the API even though the column is nullable: Google sign-ups
   * without a display name fall back to the local part of their email.
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
  AuthPayload: ResolverTypeWrapper<Omit<AuthPayload, 'user'> & { user: ResolversTypes['User'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateQuestionInput: CreateQuestionInput;
  CreateUserInput: CreateUserInput;
  GoogleAuthUrl: ResolverTypeWrapper<GoogleAuthUrl>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  LeaderboardEntry: ResolverTypeWrapper<LeaderboardEntry>;
  LeaderboardResponse: ResolverTypeWrapper<LeaderboardResponse>;
  LeaderboardUser: ResolverTypeWrapper<LeaderboardUser>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Question: ResolverTypeWrapper<QuestionModel>;
  Role: Role;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubmitAnswerResponse: ResolverTypeWrapper<SubmitAnswerResponse>;
  UpdatePasswordResponse: ResolverTypeWrapper<UpdatePasswordResponse>;
  UpdateQuestionInput: UpdateQuestionInput;
  User: ResolverTypeWrapper<UserModel>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuthPayload: Omit<AuthPayload, 'user'> & { user: ResolversParentTypes['User'] };
  Boolean: Scalars['Boolean']['output'];
  CreateQuestionInput: CreateQuestionInput;
  CreateUserInput: CreateUserInput;
  GoogleAuthUrl: GoogleAuthUrl;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  LeaderboardEntry: LeaderboardEntry;
  LeaderboardResponse: LeaderboardResponse;
  LeaderboardUser: LeaderboardUser;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  Question: QuestionModel;
  String: Scalars['String']['output'];
  SubmitAnswerResponse: SubmitAnswerResponse;
  UpdatePasswordResponse: UpdatePasswordResponse;
  UpdateQuestionInput: UpdateQuestionInput;
  User: UserModel;
}>;

export type AuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type GoogleAuthUrlResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GoogleAuthUrl'] = ResolversParentTypes['GoogleAuthUrl']> = ResolversObject<{
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  login?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'email' | 'password'>>;
  register?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType, RequireFields<MutationRegisterArgs, 'input'>>;
  submitAnswer?: Resolver<ResolversTypes['SubmitAnswerResponse'], ParentType, ContextType, RequireFields<MutationSubmitAnswerArgs, 'questionId' | 'selectedAnswer'>>;
  updateLoginStreak?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateLoginStreakArgs, 'userId'>>;
  updatePassword?: Resolver<ResolversTypes['UpdatePasswordResponse'], ParentType, ContextType, RequireFields<MutationUpdatePasswordArgs, 'currentPassword' | 'newPassword'>>;
  updateQuestion?: Resolver<ResolversTypes['Question'], ParentType, ContextType, RequireFields<MutationUpdateQuestionArgs, 'id' | 'input'>>;
  updateUsername?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUsernameArgs, 'username'>>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getGoogleAuthUrl?: Resolver<ResolversTypes['GoogleAuthUrl'], ParentType, ContextType>;
  getLeaderboard?: Resolver<ResolversTypes['LeaderboardResponse'], ParentType, ContextType, Partial<QueryGetLeaderboardArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  question?: Resolver<Maybe<ResolversTypes['Question']>, ParentType, ContextType, RequireFields<QueryQuestionArgs, 'id'>>;
  questions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type QuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question']> = ResolversObject<{
  answers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  correctAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  hint?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  prompt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SubmitAnswerResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SubmitAnswerResponse'] = ResolversParentTypes['SubmitAnswerResponse']> = ResolversObject<{
  isCorrect?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UpdatePasswordResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UpdatePasswordResponse'] = ResolversParentTypes['UpdatePasswordResponse']> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  consecutiveLoginDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dailyPoints?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  GoogleAuthUrl?: GoogleAuthUrlResolvers<ContextType>;
  LeaderboardEntry?: LeaderboardEntryResolvers<ContextType>;
  LeaderboardResponse?: LeaderboardResponseResolvers<ContextType>;
  LeaderboardUser?: LeaderboardUserResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  SubmitAnswerResponse?: SubmitAnswerResponseResolvers<ContextType>;
  UpdatePasswordResponse?: UpdatePasswordResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

