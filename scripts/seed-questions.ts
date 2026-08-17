/**
 * Seeds the question bank from the JSON sets in this directory.
 *
 *   pnpm seed:questions owner@example.com
 *   pnpm seed:questions owner@example.com --dry-run
 *
 * The bank shipped empty after the Postgres cutover: the MongoDB source this
 * repo used to import from no longer resolves, so `pnpm migrate:mongo` is a
 * dead path and these files are the only remaining source of questions.
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

  /**
   * Set only by the authored sets. The study-guide set has no domain field and
   * is classified by citation instead — see `domainFor` below.
   */
  domain?: string | null;
}

/**
 * Read in order. The study-guide set is a verbatim extraction and gets its
 * domain inferred; every later set is written against a regulatory citation
 * and carries its domain explicitly. Keeping them in separate files preserves
 * that provenance — a merged file would lose which rows were transcribed and
 * which were authored.
 */
const SEED_FILES = ["./seed-questions.json", "./seed-questions-authored.json"];

/**
 * The domain vocabulary, mirroring the twelve knowledge areas the landing page
 * advertises (`apps/web/src/app/page.tsx`) and /study-materials lists.
 *
 * Copied rather than imported: `scripts/` must not depend on `apps/web`.
 *
 * `questions.domain` is plain nullable text with no enum and no CHECK, and the
 * flash-cards filter is built from whatever distinct values are in the table.
 * A typo would therefore create a thirteenth bucket in the UI and raise no
 * error anywhere, so an explicit domain is validated against this list before
 * anything is inserted.
 */
const PART_107_DOMAINS = [
  "Regulations",
  "Airspace classification",
  "Weather sources",
  "Loading and performance",
  "Emergency procedures",
  "Crew resource management",
  "Radio procedures",
  "Physiological effects",
  "Decision-making",
  "Airport operations",
  "Maintenance",
  "Night operations",
];

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

/**
 * An explicit domain wins; citation inference is the fallback for the sets that
 * carry no domain field.
 */
function resolveDomain(question: SeedQuestion): string | null {
  const explicit = question.domain?.trim();
  if (explicit) return explicit;
  return domainFor(question.prompt);
}

/**
 * Everything that would otherwise fail late — halfway through a chunked insert,
 * with no transaction to roll back — or not fail at all.
 */
function validate(questions: SeedQuestion[]): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, question] of questions.entries()) {
    const where = `#${index + 1} ${question.questionText?.slice(0, 60) ?? "(no questionText)"}`;

    if (!question.prompt?.trim()) problems.push(`${where}: empty prompt`);
    if (!question.questionText?.trim()) {
      problems.push(`${where}: empty questionText`);
    } else if (seen.has(question.questionText)) {
      problems.push(`${where}: duplicate questionText`);
    } else {
      seen.add(question.questionText);
    }

    // Mirrors `assertAnswerable` in the createQuestion resolver, so a seeded
    // row is one the API would also have accepted.
    if (!Array.isArray(question.answers) || question.answers.length < 2) {
      problems.push(`${where}: needs at least two answers`);
    } else if (!question.answers.includes(question.correctAnswer)) {
      problems.push(`${where}: correctAnswer is not one of the answers`);
    }

    if (!Number.isInteger(question.points) || question.points < 1) {
      problems.push(`${where}: points must be a positive integer`);
    }

    const explicit = question.domain?.trim();
    if (explicit && !PART_107_DOMAINS.includes(explicit)) {
      problems.push(`${where}: unknown domain "${explicit}"`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${problems.length} problem(s) in the seed data:\n  ${problems.join("\n  ")}`,
    );
  }
}

function readSeedFiles(): SeedQuestion[] {
  return SEED_FILES.flatMap((file) => {
    const questions: SeedQuestion[] = JSON.parse(
      readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8"),
    );
    console.log(`  ${file}: ${questions.length}`);
    return questions;
  });
}

async function main(): Promise<void> {
  // pnpm forwards a literal "--" separator through to the script, so drop it
  // rather than treating it as the email and reporting a baffling lookup.
  const args = process.argv
    .slice(2)
    .map((arg) => arg.trim())
    .filter((arg) => arg && arg !== "--");

  const dryRun = args.includes("--dry-run");
  const email = args.find((arg) => !arg.startsWith("--"));

  if (!email) {
    throw new Error(
      "Usage: pnpm seed:questions owner@example.com [--dry-run]\n" +
        "The owner must already have registered through the app.",
    );
  }

  if (dryRun) console.log("Dry run: nothing will be written.\n");

  // Read and validate before opening a connection. Bad seed data should be
  // reported without a database round trip, and a chunked insert has no
  // transaction to roll back if a later chunk turns out to be malformed.
  console.log("Seed files:");
  const seed = readSeedFiles();
  validate(seed);

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
    if (dryRun) {
      console.log(`Would promote ${email} to SUPER_ADMIN.`);
    } else {
      await db
        .update(users)
        .set({ role: "SUPER_ADMIN", updatedAt: new Date() })
        .where(eq(users.id, owner.id));
      console.log(`Promoted ${email} to SUPER_ADMIN.`);
    }
  } else {
    console.log("Already SUPER_ADMIN, no change.");
  }

  const existing = await db
    .select({ questionText: questions.questionText })
    .from(questions);
  const known = new Set(existing.map((row) => row.questionText));

  // `known` grows as the filter runs. Without that a questionText repeated
  // across two seed files would pass the check twice and insert twice — there
  // is no unique constraint on the column to catch it.
  const pending = seed.filter((q) => {
    if (known.has(q.questionText)) return false;
    known.add(q.questionText);
    return true;
  });

  console.log(
    `Bank: ${existing.length} present, ${seed.length} in seed, ${pending.length} to insert.`,
  );

  const rows = pending.map((q) => ({
    prompt: q.prompt,
    questionText: q.questionText,
    answers: q.answers,
    correctAnswer: q.correctAnswer,
    hint: q.hint?.trim() ? q.hint.trim() : null,
    points: q.points,
    domain: resolveDomain(q),
    createdBy: owner.id,
  }));

  const byDomain = new Map<string, number>();
  for (const row of rows) {
    const key = row.domain ?? "(unclassified)";
    byDomain.set(key, (byDomain.get(key) ?? 0) + 1);
  }
  for (const [domain, count] of [...byDomain].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${domain}`);
  }

  if (dryRun) {
    console.log(`\nDry run complete. ${rows.length} would be inserted.`);
    return;
  }

  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

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
