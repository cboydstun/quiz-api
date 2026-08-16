import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const MANAGEMENT_LIST = /* GraphQL */ `
  query AllQuestions {
    questions {
      id
      prompt
      questionText
      answers
      correctAnswer
      hint
      points
      createdBy {
        id
        username
      }
    }
  }
`;

// The quiz page deliberately omits correctAnswer so grading stays server-side.
const QUIZ_LIST = /* GraphQL */ `
  query GetQuizQuestions {
    questions {
      id
      prompt
      questionText
      answers
      hint
      points
    }
  }
`;

const CREATE = /* GraphQL */ `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      prompt
      questionText
      answers
      correctAnswer
      hint
      points
    }
  }
`;

const VALID_INPUT = {
  prompt: "Airspace",
  questionText: "What is the ceiling of Class G airspace?",
  answers: ["700 ft AGL", "1,200 ft AGL", "14,500 ft MSL", "It varies"],
  correctAnswer: "It varies",
  hint: "",
  points: 2,
};

async function seedQuestion(h: TestHarness, createdBy: string) {
  const [row] = await h.db
    .insert(questions)
    .values({ ...VALID_INPUT, hint: null, createdBy })
    .returning();
  return row!;
}

describe("questions", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it("requires authentication to read the question bank", async () => {
    const res = await h.execute(QUIZ_LIST);
    expect(res.errors[0]?.message).toBe(
      "Authorization header must be provided",
    );
  });

  it("returns the author alongside each question in one pass", async () => {
    const author = await h.createUser({ role: "EDITOR", username: "author1" });
    await seedQuestion(h, author.id);
    const reader = await h.createUser();

    const res = await h.execute<{
      questions: { createdBy: { id: string; username: string } }[];
    }>(MANAGEMENT_LIST, { token: h.tokenFor(reader) });

    expect(res.errors).toEqual([]);
    expect(res.data?.questions[0]?.createdBy.username).toBe("author1");
  });

  it("serves the quiz selection without the correct answer", async () => {
    const author = await h.createUser({ role: "EDITOR", username: "author2" });
    await seedQuestion(h, author.id);
    const reader = await h.createUser();

    const res = await h.execute<{ questions: Record<string, unknown>[] }>(
      QUIZ_LIST,
      { token: h.tokenFor(reader) },
    );
    expect(res.errors).toEqual([]);
    expect(res.data?.questions[0]).not.toHaveProperty("correctAnswer");
  });

  it("fetches a single question for the flash-cards page", async () => {
    const author = await h.createUser({ role: "EDITOR", username: "author3" });
    const seeded = await seedQuestion(h, author.id);
    const reader = await h.createUser();

    const res = await h.execute<{
      question: { id: string; correctAnswer: string };
    }>(
      `query GetQuestion($id: ID!) {
         question(id: $id) {
           id prompt questionText answers correctAnswer createdBy { id username }
         }
       }`,
      { token: h.tokenFor(reader), variables: { id: seeded.id } },
    );

    expect(res.errors).toEqual([]);
    expect(res.data?.question.id).toBe(seeded.id);
  });

  it("lets an editor create a question and stores an empty hint as null", async () => {
    const editor = await h.createUser({ role: "EDITOR" });

    const res = await h.execute<{
      createQuestion: { id: string; hint: string | null; points: number };
    }>(CREATE, {
      token: h.tokenFor(editor),
      variables: { input: VALID_INPUT },
    });

    expect(res.errors).toEqual([]);
    // The management form always sends "" rather than omitting the field.
    expect(res.data?.createQuestion.hint).toBeNull();
    expect(res.data?.createQuestion.points).toBe(2);
  });

  it("refuses question writes from an ordinary user without logging them out", async () => {
    const plain = await h.createUser({ role: "USER" });

    const res = await h.execute(CREATE, {
      token: h.tokenFor(plain),
      variables: { input: VALID_INPUT },
    });

    expect(res.errors[0]?.message).toMatch(/forbidden/i);
    expect(res.errors[0]?.message).not.toMatch(/unauthorized|unauthenticated/i);
  });

  it("rejects a question whose correct answer is not among the answers", async () => {
    const editor = await h.createUser({ role: "EDITOR" });

    const res = await h.execute(CREATE, {
      token: h.tokenFor(editor),
      variables: {
        input: { ...VALID_INPUT, correctAnswer: "Not in the list" },
      },
    });
    expect(res.errors[0]?.message).toMatch(/must be one of the answers/i);
  });

  it("updates and deletes a question", async () => {
    const editor = await h.createUser({ role: "EDITOR", username: "author4" });
    const seeded = await seedQuestion(h, editor.id);

    const updated = await h.execute<{ updateQuestion: { prompt: string } }>(
      `mutation UpdateQuestion($questionId: ID!, $input: UpdateQuestionInput!) {
         updateQuestion(id: $questionId, input: $input) {
           id prompt questionText answers correctAnswer hint points
           createdBy { id username }
         }
       }`,
      {
        token: h.tokenFor(editor),
        variables: {
          questionId: seeded.id,
          input: { ...VALID_INPUT, prompt: "Revised prompt" },
        },
      },
    );
    expect(updated.data?.updateQuestion.prompt).toBe("Revised prompt");

    const deleted = await h.execute<{ deleteQuestion: boolean }>(
      `mutation DeleteQuestion($questionId: ID!) { deleteQuestion(id: $questionId) }`,
      { token: h.tokenFor(editor), variables: { questionId: seeded.id } },
    );
    expect(deleted.data?.deleteQuestion).toBe(true);
  });

  it("will not delete a user who still owns questions", async () => {
    const admin = await h.createUser({ role: "ADMIN" });
    const author = await h.createUser({ role: "EDITOR", username: "author5" });
    await seedQuestion(h, author.id);

    const res = await h.execute(
      `mutation D($userId: ID!) { deleteUser(userId: $userId) }`,
      { token: h.tokenFor(admin), variables: { userId: author.id } },
    );

    // Better than letting the ON DELETE RESTRICT surface as "Unexpected error."
    expect(res.errors[0]?.message).toMatch(/still has questions/i);
  });
});
