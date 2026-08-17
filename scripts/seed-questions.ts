/**
 * Seeds the question bank from the FAA study-guide question set.
 *
 *   pnpm seed:questions owner@example.com
 *
 * The bank shipped empty after the Postgres cutover: the MongoDB source this
 * repo used to import from no longer resolves, so `pnpm migrate:mongo` is a
 * dead path and this file is the only remaining source of questions.
 *
 * `questions.created_by` is NOT NULL, so the questions need an owner that
 * already exists. That owner registers through the app in the normal way —
 * this script never creates an account or touches a password. It looks the
 * user up by email, promotes them to SUPER_ADMIN, and attributes the bank to
 * them.
 *
 * Safe to re-run. There is no unique constraint on `question_text` and these
 * rows carry no `legacy_mongo_id`, so the script reads what is already there
 * and inserts only what is missing. A second run inserts nothing.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { questions, users } from "../packages/db/src/schema.js";

interface SeedQuestion {
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  hint: string;
  points: number;
}

/**
 * Every prompt opens with its study-guide citation, and the guide's chapters
 * map onto Part 107 knowledge areas.
 *
 * This is chapter-level inference rather than data — the source has no domain
 * field. It is deliberately coarse: Chapter 5 mixes emergency procedures with
 * preflight inspection, and Chapter 3b straddles weather and performance.
 * Individual questions get corrected through the Domain field in /management.
 *
 * The Introduction questions are about the study guide itself — how to contact
 * the FAA, what the document is for — so they are left unclassified rather
 * than forced into a knowledge area they do not belong to.
 */
const CHAPTER_DOMAINS: Record<string, string | null> = {
  Introduction: null,
  "Chapter 1": "Regulations",
  "Chapter 2": "Airspace classification",
  "Chapter 3a": "Weather sources",
  "Chapter 3b": "Weather sources",
  "Chapter 4": "Loading and performance",
  "Chapter 5": "Emergency procedures",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function domainFor(prompt: string): string | null {
  const chapter = /^([^,:]+)/.exec(prompt)?.[1]?.trim();
  if (!chapter) return null;
  if (!(chapter in CHAPTER_DOMAINS)) {
    // A citation the mapping has not seen. Leaving it unclassified is correct;
    // guessing would put it in the wrong breakdown with no way to notice.
    console.warn(`  ! unmapped citation, left unclassified: ${chapter}`);
    return null;
  }
  return CHAPTER_DOMAINS[chapter] ?? null;
}

async function main(): Promise<void> {
  // pnpm forwards a literal "--" separator through to the script, so drop it
  // rather than treating it as the email and reporting a baffling lookup.
  const email = process.argv
    .slice(2)
    .map((arg) => arg.trim())
    .find((arg) => arg && arg !== "--");

  if (!email) {
    throw new Error(
      "Usage: pnpm seed:questions owner@example.com\n" +
        "The owner must already have registered through the app.",
    );
  }

  const db = drizzle(neon(requireEnv("DATABASE_URL")));

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!owner) {
    throw new Error(
      `No user with email ${email}. Register at /register first — this script ` +
        `will not create the account.`,
    );
  }
  console.log(`Owner: ${owner.username ?? owner.email} (${owner.role})`);

  if (owner.role !== "SUPER_ADMIN") {
    await db
      .update(users)
      .set({ role: "SUPER_ADMIN", updatedAt: new Date() })
      .where(eq(users.id, owner.id));
    console.log(`Promoted ${email} to SUPER_ADMIN.`);
  } else {
    console.log("Already SUPER_ADMIN, no change.");
  }

  const seed: SeedQuestion[] = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./seed-questions.json", import.meta.url)),
      "utf8",
    ),
  );

  const existing = await db
    .select({ questionText: questions.questionText })
    .from(questions);
  const known = new Set(existing.map((row) => row.questionText));

  const pending = seed.filter((q) => !known.has(q.questionText));
  console.log(
    `Bank: ${existing.length} present, ${seed.length} in seed, ${pending.length} to insert.`,
  );

  if (pending.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const rows = pending.map((q) => ({
    prompt: q.prompt,
    questionText: q.questionText,
    answers: q.answers,
    correctAnswer: q.correctAnswer,
    hint: q.hint?.trim() ? q.hint.trim() : null,
    points: q.points,
    domain: domainFor(q.prompt),
    createdBy: owner.id,
  }));

  // neon-http has no transactions, so this goes in chunks rather than one
  // statement. A partial failure leaves the bank short but never duplicated —
  // re-running picks up exactly what is missing.
  const CHUNK = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db.insert(questions).values(batch);
    inserted += batch.length;
    console.log(`  inserted ${inserted}/${rows.length}`);
  }

  const classified = rows.filter((r) => r.domain !== null).length;
  console.log(
    `Done. ${inserted} inserted, ${classified} classified, ` +
      `${inserted - classified} left unclassified.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
