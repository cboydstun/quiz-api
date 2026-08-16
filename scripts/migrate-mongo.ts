/**
 * One-off import of the previous MongoDB backend into Postgres.
 *
 *   pnpm migrate:mongo
 *
 * Scope (agreed): users and questions. User responses are not imported — the
 * aggregate counters carried on each user are what the UI actually displays.
 *
 * Safe to re-run. Every row is keyed by its original Mongo `_id` in
 * `legacy_mongo_id`, so a second run updates rather than duplicates.
 *
 * bcrypt hashes are copied verbatim, so existing passwords keep working; the
 * new backend hashes at the same cost factor.
 */
import { MongoClient, type Document } from "mongodb";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { questions, users, type Role } from "../packages/db/src/schema.js";

const VALID_ROLES: Role[] = ["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function asRole(value: unknown): Role {
  return VALID_ROLES.includes(value as Role) ? (value as Role) : "USER";
}

function asInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

async function main() {
  const mongo = new MongoClient(
    process.env.MONGO_URI ?? requireEnv("MONGODB_URI"),
  );
  const db = drizzle(neon(requireEnv("DATABASE_URL")));

  await mongo.connect();
  const source = mongo.db();

  const mongoUsers = await source.collection("users").find({}).toArray();
  const mongoQuestions = await source
    .collection("questions")
    .find({})
    .toArray();
  console.log(
    `Mongo: ${mongoUsers.length} users, ${mongoQuestions.length} questions`,
  );

  // Usernames are unique in Postgres but were only sparsely unique in Mongo,
  // and emails are matched case-insensitively by the new login resolver.
  const usedUsernames = new Set<string>();
  const seenEmails = new Set<string>();
  let userCount = 0;
  const skipped: string[] = [];

  for (const doc of mongoUsers as Document[]) {
    const legacyId = String(doc._id);
    const email = String(doc.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      skipped.push(`${legacyId}: no email`);
      continue;
    }
    if (seenEmails.has(email)) {
      skipped.push(`${legacyId}: duplicate email ${email}`);
      continue;
    }
    seenEmails.add(email);

    let username: string | null = doc.username
      ? String(doc.username).trim()
      : null;
    if (username) {
      const base = username;
      let suffix = 1;
      while (usedUsernames.has(username)) {
        username = `${base}${suffix}`;
        suffix += 1;
      }
      usedUsernames.add(username);
    }

    const values = {
      legacyMongoId: legacyId,
      username,
      email,
      password: doc.password ? String(doc.password) : null,
      googleId: doc.googleId ? String(doc.googleId) : null,
      role: asRole(doc.role),
      score: asInt(doc.score),
      questionsAnswered: asInt(doc.questionsAnswered),
      questionsCorrect: asInt(doc.questionsCorrect),
      questionsIncorrect: asInt(doc.questionsIncorrect),
      lifetimePoints: asInt(doc.lifetimePoints),
      yearlyPoints: asInt(doc.yearlyPoints),
      monthlyPoints: asInt(doc.monthlyPoints),
      dailyPoints: asInt(doc.dailyPoints),
      consecutiveLoginDays: asInt(doc.consecutiveLoginDays),
      lastLoginDate: asDate(doc.lastLoginDate),
      createdAt: asDate(doc.createdAt) ?? new Date(),
      updatedAt: asDate(doc.updatedAt) ?? new Date(),
    };

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.legacyMongoId, set: values });
    userCount += 1;
  }

  // Map original author ids to the new UUIDs.
  const imported = await db
    .select({ id: users.id, legacyMongoId: users.legacyMongoId })
    .from(users);
  const authorByLegacyId = new Map(
    imported
      .filter((row) => row.legacyMongoId)
      .map((row) => [row.legacyMongoId as string, row.id]),
  );

  let questionCount = 0;
  for (const doc of mongoQuestions as Document[]) {
    const legacyId = String(doc._id);
    const authorId = authorByLegacyId.get(String(doc.createdBy));

    if (!authorId) {
      skipped.push(
        `question ${legacyId}: author ${doc.createdBy} not imported`,
      );
      continue;
    }

    const answers = Array.isArray(doc.answers) ? doc.answers.map(String) : [];
    if (answers.length === 0) {
      skipped.push(`question ${legacyId}: no answers`);
      continue;
    }

    const values = {
      legacyMongoId: legacyId,
      prompt: String(doc.prompt ?? ""),
      questionText: String(doc.questionText ?? ""),
      answers,
      correctAnswer: String(doc.correctAnswer ?? ""),
      hint: doc.hint ? String(doc.hint) : null,
      points: asInt(doc.points) || 1,
      createdBy: authorId,
      createdAt: asDate(doc.createdAt) ?? new Date(),
      updatedAt: asDate(doc.updatedAt) ?? new Date(),
    };

    await db
      .insert(questions)
      .values(values)
      .onConflictDoUpdate({ target: questions.legacyMongoId, set: values });
    questionCount += 1;
  }

  await mongo.close();

  console.log(
    `Postgres: imported ${userCount} users, ${questionCount} questions`,
  );
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} record(s):`);
    for (const reason of skipped) console.log(`  - ${reason}`);
  }

  // Anything the new backend cannot answer for is worth knowing about now.
  const orphaned = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.correctAnswer, ""));
  if (orphaned.length) {
    console.warn(
      `WARNING: ${orphaned.length} question(s) have no correct answer.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
