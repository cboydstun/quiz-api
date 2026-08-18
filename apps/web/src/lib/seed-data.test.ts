import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The seed files are the source of truth for the question bank, and the
 * explanations in them are published verbatim on /practice — where they are
 * the only original content on the page. A malformed one is a content defect
 * that reaches search results, so it is worth catching here rather than after
 * a --update against production.
 */
// Resolved from the package root (vitest runs with cwd = apps/web) rather than
// from import.meta.url, which vite rewrites to an /@fs path.
const load = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), "../../scripts", name), "utf8"),
  ) as {
    questionText: string;
    correctAnswer: string;
    answers: string[];
    hint: string;
    explanation?: string;
  }[];

const SETS = [
  ["study guide", load("seed-questions.json")],
  ["authored", load("seed-questions-authored.json")],
] as const;

describe.each(SETS)("%s seed set", (_name, questions) => {
  it("gives every question an explanation", () => {
    const missing = questions.filter((q) => !q.explanation?.trim());
    expect(missing.map((q) => q.questionText)).toEqual([]);
  });

  /**
   * The hint is offered before answering and must not give the answer away;
   * the explanation justifies it afterwards. A copy of one in the other means
   * the run has stopped teaching anything at the point it matters most — and
   * the seeder rejects it outright.
   */
  it("never reuses the hint as the explanation", () => {
    const duplicated = questions.filter(
      (q) => q.explanation?.trim() === q.hint?.trim(),
    );
    expect(duplicated.map((q) => q.questionText)).toEqual([]);
  });

  it("writes explanations long enough to explain something", () => {
    const thin = questions.filter(
      (q) => (q.explanation ?? "").split(/\s+/).length < 25,
    );
    expect(thin.map((q) => q.questionText)).toEqual([]);
  });

  it("keeps the correct answer among the options it is graded against", () => {
    const unanswerable = questions.filter(
      (q) => !q.answers.includes(q.correctAnswer),
    );
    expect(unanswerable.map((q) => q.questionText)).toEqual([]);
  });
});

describe("the bank as a whole", () => {
  const all = SETS.flatMap(([, questions]) => questions);

  it("holds no duplicate question text", () => {
    // question_text is the key --update reconciles on, and the column carries
    // no unique constraint — a duplicate would silently update the wrong row.
    const seen = new Set<string>();
    const duplicates = all.filter((q) => {
      if (seen.has(q.questionText)) return true;
      seen.add(q.questionText);
      return false;
    });
    expect(duplicates.map((q) => q.questionText)).toEqual([]);
  });
});
