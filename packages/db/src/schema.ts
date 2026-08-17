import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Mirrors the GraphQL `Role` enum exactly. The frontend narrows role strings
 * against this same list (`apps/web/src/types/index.ts`), so the three
 * definitions must stay in lockstep.
 */
export const roleEnum = pgEnum("role", [
  "USER",
  "EDITOR",
  "ADMIN",
  "SUPER_ADMIN",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Unique but nullable: Google sign-ups arrive without a chosen username,
    // matching the old Mongoose `sparse: true` index.
    username: text("username").unique(),
    email: text("email").notNull().unique(),

    // Null for accounts that only ever signed in through Google.
    password: text("password"),
    googleId: text("google_id").unique(),

    role: roleEnum("role").notNull().default("USER"),

    score: integer("score").notNull().default(0),
    questionsAnswered: integer("questions_answered").notNull().default(0),
    questionsCorrect: integer("questions_correct").notNull().default(0),
    questionsIncorrect: integer("questions_incorrect").notNull().default(0),

    lifetimePoints: integer("lifetime_points").notNull().default(0),
    yearlyPoints: integer("yearly_points").notNull().default(0),
    monthlyPoints: integer("monthly_points").notNull().default(0),
    dailyPoints: integer("daily_points").notNull().default(0),

    consecutiveLoginDays: integer("consecutive_login_days")
      .notNull()
      .default(0),
    lastLoginDate: timestamp("last_login_date", { withTimezone: true }),

    // Selected by the profile page but never implemented server-side. Empty
    // until a skills feature exists; the column keeps the query answerable.
    skills: text("skills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    // Set only by the one-off Mongo import, which uses it to stay idempotent.
    legacyMongoId: text("legacy_mongo_id").unique(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The leaderboard's only ordering: score desc, then username asc.
    index("users_leaderboard_idx").on(table.score.desc(), table.username.asc()),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prompt: text("prompt").notNull(),
    questionText: text("question_text").notNull(),
    answers: text("answers").array().notNull(),
    correctAnswer: text("correct_answer").notNull(),
    hint: text("hint"),
    points: integer("points").notNull().default(1),

    // Part 107 subject area. Nullable on purpose: the bank predates this
    // column and nothing guesses a value for the rows that came over from
    // MongoDB. An unclassified question is simply left out of the per-domain
    // accuracy breakdown — editors assign domains through /management.
    domain: text("domain"),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    legacyMongoId: text("legacy_mongo_id").unique(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("questions_created_by_idx").on(table.createdBy),
    index("questions_domain_idx").on(table.domain),
  ],
);

export const userResponses = pgTable(
  "user_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selectedAnswer: text("selected_answer").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_responses_user_idx").on(table.userId)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type QuestionRow = typeof questions.$inferSelect;
export type NewQuestionRow = typeof questions.$inferInsert;
export type UserResponseRow = typeof userResponses.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
