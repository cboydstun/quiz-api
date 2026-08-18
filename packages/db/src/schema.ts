import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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

    /**
     * Why the correct answer is correct, shown after a run is graded.
     *
     * Nullable because the bank predates it and nothing invents one: a
     * question with no explanation simply shows its answer without a reason.
     * Distinct from `hint`, which is offered *before* answering and must not
     * give the answer away.
     */
    explanation: text("explanation"),

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
  (table) => [
    index("user_responses_user_idx").on(table.userId),
    // domainAccuracy joins questions on this column, and the ON DELETE CASCADE
    // from questions has to find the rows to cascade to — an unindexed foreign
    // key makes deleting one question a full scan of every response ever made.
    index("user_responses_question_idx").on(table.questionId),
  ],
);

/**
 * One row per operator per day of the trail.
 *
 * The trail is a permadeath run over the daily route: you get one attempt, and
 * the `(user_id, trail_date)` unique index *is* that rule. An application-level
 * "have you flown today?" check is a race, and the client can simply not ask.
 *
 * The answers themselves are not here — a signed-in run submits every question
 * through `submitAnswer`, so points, score, and domain accuracy all move on the
 * existing path and the trail needs no second ledger. What this table stores is
 * only the run's outcome, which is what makes the day spent.
 *
 * A signed-out visitor has no row at all: `gradeAnswers` records nothing, so
 * their one-per-day is localStorage and therefore bypassable. That is the gap
 * the death screen sells an account against.
 */
export const trailRuns = pgTable(
  "trail_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // The UTC calendar day whose route was flown, "YYYY-MM-DD". A date rather
    // than a timestamp: the trail rolls over at midnight UTC for everyone.
    trailDate: date("trail_date", { mode: "string" }).notNull(),

    // How far the run got, 1-based. `completed` is not derivable from it: a
    // thin bank can produce a trail shorter than eight legs.
    legsReached: integer("legs_reached").notNull(),
    completed: boolean("completed").notNull(),

    batteryLeft: integer("battery_left").notNull(),
    airframeLeft: integer("airframe_left").notNull(),

    correct: integer("correct").notNull(),
    total: integer("total").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("trail_runs_user_date_key").on(table.userId, table.trailDate),
    index("trail_runs_date_idx").on(table.trailDate),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type QuestionRow = typeof questions.$inferSelect;
export type NewQuestionRow = typeof questions.$inferInsert;
export type UserResponseRow = typeof userResponses.$inferSelect;
export type TrailRunRow = typeof trailRuns.$inferSelect;
export type NewTrailRunRow = typeof trailRuns.$inferInsert;
export type Role = (typeof roleEnum.enumValues)[number];
