import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { questions, userResponses, users } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const SUBMIT = /* GraphQL */ `
  mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
    submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
      success
      isCorrect
      correctAnswer
      explanation
    }
  }
`;

describe("submitAnswer", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  async function seedQuestion(createdBy: string, points = 5) {
    const [row] = await h.db
      .insert(questions)
      .values({
        prompt: "p",
        questionText: "q",
        answers: ["a", "b"],
        correctAnswer: "a",
        explanation: "because a",
        points,
        createdBy,
      })
      .returning();
    return row!;
  }

  it("grades a correct answer and credits the points", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id, 5);
    const player = await h.createUser();

    const res = await h.execute<{
      submitAnswer: {
        success: boolean;
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string | null;
      };
    }>(SUBMIT, {
      token: h.tokenFor(player),
      variables: { questionId: question.id, selectedAnswer: "a" },
    });

    expect(res.data?.submitAnswer).toEqual({
      success: true,
      isCorrect: true,
      correctAnswer: "a",
      explanation: "because a",
    });

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.id, player.id));
    expect(row?.score).toBe(5);
    expect(row?.questionsAnswered).toBe(1);
    expect(row?.questionsCorrect).toBe(1);
    expect(row?.questionsIncorrect).toBe(0);
  });

  it("records a wrong answer without awarding points", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id, 5);
    const player = await h.createUser();

    const res = await h.execute<{ submitAnswer: { isCorrect: boolean } }>(
      SUBMIT,
      {
        token: h.tokenFor(player),
        variables: { questionId: question.id, selectedAnswer: "b" },
      },
    );

    expect(res.data?.submitAnswer.isCorrect).toBe(false);

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.id, player.id));
    expect(row?.score).toBe(0);
    expect(row?.questionsIncorrect).toBe(1);
  });

  it("stores one response row per submission", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id);
    const player = await h.createUser();

    await h.execute(SUBMIT, {
      token: h.tokenFor(player),
      variables: { questionId: question.id, selectedAnswer: "a" },
    });

    const rows = await h.db
      .select()
      .from(userResponses)
      .where(eq(userResponses.userId, player.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.selectedAnswer).toBe("a");
  });

  /**
   * The quiz page submits every answer at once through Promise.all. With
   * read-modify-write counters most of these increments would be lost.
   */
  it("keeps every increment when a whole quiz is submitted concurrently", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const player = await h.createUser();

    const questionRows = await Promise.all(
      Array.from({ length: 10 }, () => seedQuestion(editor.id, 3)),
    );

    await Promise.all(
      questionRows.map((question) =>
        h.execute(SUBMIT, {
          token: h.tokenFor(player),
          variables: { questionId: question.id, selectedAnswer: "a" },
        }),
      ),
    );

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.id, player.id));
    expect(row?.questionsAnswered).toBe(10);
    expect(row?.questionsCorrect).toBe(10);
    expect(row?.score).toBe(30);
  });

  it("requires a logged-in user", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id);

    const res = await h.execute(SUBMIT, {
      variables: { questionId: question.id, selectedAnswer: "a" },
    });
    expect(res.errors[0]?.message).toBe(
      "Authorization header must be provided",
    );
  });

  /**
   * A wrong answer teaches nothing if the run cannot say what the right one
   * was. Revealing it here rather than on the Question type keeps the answer
   * key unreachable until the attempt is in.
   */
  it("reveals the answer and the reason once the attempt is recorded", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id);
    const player = await h.createUser();

    const res = await h.execute<{
      submitAnswer: {
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string | null;
      };
    }>(SUBMIT, {
      token: h.tokenFor(player),
      variables: { questionId: question.id, selectedAnswer: "b" },
    });

    expect(res.data?.submitAnswer.isCorrect).toBe(false);
    expect(res.data?.submitAnswer.correctAnswer).toBe("a");
    expect(res.data?.submitAnswer.explanation).toBe("because a");
  });

  /**
   * Without this the mutation is a free-text oracle: submit guesses until one
   * grades true, then submit the winner for points.
   */
  it("rejects an answer that was never one of the options", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id);
    const player = await h.createUser();

    const res = await h.execute(SUBMIT, {
      token: h.tokenFor(player),
      variables: { questionId: question.id, selectedAnswer: "not an option" },
    });

    expect(res.errors[0]?.message).toMatch(/not one of the options/i);
  });

  /**
   * The streak used to advance only when /profile was opened, so a user who
   * answered questions daily and never looked at their record stayed on zero.
   */
  it("advances the login streak from answering, not from visiting a page", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const question = await seedQuestion(editor.id);
    const player = await h.createUser();

    expect(player.consecutiveLoginDays).toBe(0);

    await h.execute(SUBMIT, {
      token: h.tokenFor(player),
      variables: { questionId: question.id, selectedAnswer: "a" },
    });

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.id, player.id));
    expect(row?.consecutiveLoginDays).toBe(1);
    expect(row?.lastLoginDate).not.toBeNull();
  });

  it("does not inflate the streak across a single run", async () => {
    const editor = await h.createUser({ role: "EDITOR" });
    const player = await h.createUser();
    const questionRows = await Promise.all(
      Array.from({ length: 5 }, () => seedQuestion(editor.id)),
    );

    await Promise.all(
      questionRows.map((question) =>
        h.execute(SUBMIT, {
          token: h.tokenFor(player),
          variables: { questionId: question.id, selectedAnswer: "a" },
        }),
      ),
    );

    const [row] = await h.db
      .select()
      .from(users)
      .where(eq(users.id, player.id));
    expect(row?.consecutiveLoginDays).toBe(1);
  });

  it("reports a missing question rather than failing silently", async () => {
    const player = await h.createUser();
    const res = await h.execute(SUBMIT, {
      token: h.tokenFor(player),
      variables: {
        questionId: "00000000-0000-0000-0000-000000000000",
        selectedAnswer: "a",
      },
    });
    expect(res.errors[0]?.message).toMatch(/not found/i);
  });
});
