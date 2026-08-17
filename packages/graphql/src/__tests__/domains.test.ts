import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { questions, userResponses } from "@quiz/db";
import { createHarness, type TestHarness } from "./harness";

const CREATE = /* GraphQL */ `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      domain
    }
  }
`;

const UPDATE = /* GraphQL */ `
  mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
    updateQuestion(id: $id, input: $input) {
      id
      domain
    }
  }
`;

const LIST_BY_DOMAIN = /* GraphQL */ `
  query Questions($domain: String) {
    questions(domain: $domain) {
      id
      questionText
      domain
    }
  }
`;

const DOMAINS = /* GraphQL */ `
  query QuestionDomains {
    questionDomains
  }
`;

const MY_ACCURACY = /* GraphQL */ `
  query Me {
    me {
      domainAccuracy {
        domain
        answered
        correct
        accuracy
      }
    }
  }
`;

const THEIR_ACCURACY = /* GraphQL */ `
  query User($id: ID!) {
    user(id: $id) {
      domainAccuracy {
        domain
      }
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

interface Accuracy {
  domain: string;
  answered: number;
  correct: number;
  accuracy: number;
}

describe("question domains", () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  async function seedQuestion(createdBy: string, domain: string | null) {
    const [row] = await h.db
      .insert(questions)
      .values({
        prompt: "p",
        questionText: `q-${domain ?? "none"}-${Math.random()}`,
        answers: ["a", "b"],
        correctAnswer: "a",
        points: 5,
        domain,
        createdBy,
      })
      .returning();
    return row!;
  }

  async function answer(
    userId: string,
    questionId: string,
    isCorrect: boolean,
  ) {
    await h.db.insert(userResponses).values({
      userId,
      questionId,
      selectedAnswer: isCorrect ? "a" : "b",
      isCorrect,
    });
  }

  describe("as a field on the question", () => {
    it("round-trips through create and update", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const token = h.tokenFor(editor);

      const created = await h.execute<{
        createQuestion: { id: string; domain: string };
      }>(CREATE, {
        variables: { input: { ...VALID_INPUT, domain: "Regulations" } },
        token,
      });
      expect(created.data?.createQuestion.domain).toBe("Regulations");

      const updated = await h.execute<{ updateQuestion: { domain: string } }>(
        UPDATE,
        {
          variables: {
            id: created.data!.createQuestion.id,
            input: { ...VALID_INPUT, domain: "Weather" },
          },
          token,
        },
      );
      expect(updated.data?.updateQuestion.domain).toBe("Weather");
    });

    it("stores a blank domain as absent, the way it treats a blank hint", async () => {
      const editor = await h.createUser({ role: "EDITOR" });

      const res = await h.execute<{
        createQuestion: { domain: string | null };
      }>(CREATE, {
        variables: { input: { ...VALID_INPUT, domain: "   " } },
        token: h.tokenFor(editor),
      });
      expect(res.data?.createQuestion.domain).toBeNull();
    });
  });

  describe("filtering the bank", () => {
    it("narrows to one domain, and returns everything when unfiltered", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const reader = await h.createUser();
      const token = h.tokenFor(reader);

      // Assertions go by id, not by count: the harness shares one database
      // across the file, so other tests' questions are in the bank too.
      const air1 = await seedQuestion(editor.id, "Airspace");
      const air2 = await seedQuestion(editor.id, "Airspace");
      const wx = await seedQuestion(editor.id, "Weather");
      const none = await seedQuestion(editor.id, null);

      const filtered = await h.execute<{
        questions: { id: string; domain: string }[];
      }>(LIST_BY_DOMAIN, { variables: { domain: "Airspace" }, token });

      const filteredIds = filtered.data!.questions.map((q) => q.id);
      expect(filteredIds).toEqual(expect.arrayContaining([air1.id, air2.id]));
      expect(filteredIds).not.toContain(wx.id);
      expect(filteredIds).not.toContain(none.id);
      expect(
        filtered.data?.questions.every((q) => q.domain === "Airspace"),
      ).toBe(true);

      const all = await h.execute<{ questions: { id: string }[] }>(
        LIST_BY_DOMAIN,
        { token },
      );
      // Unfiltered includes the unclassified question; filtered never does.
      expect(all.data!.questions.map((q) => q.id)).toEqual(
        expect.arrayContaining([air1.id, air2.id, wx.id, none.id]),
      );
    });

    it("lists distinct domains sorted, omitting unclassified questions", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const reader = await h.createUser();
      await seedQuestion(editor.id, "Airspace");
      await seedQuestion(editor.id, null);

      const res = await h.execute<{ questionDomains: string[] }>(DOMAINS, {
        token: h.tokenFor(reader),
      });
      const domains = res.data!.questionDomains;

      expect(domains).toContain("Airspace");
      expect(new Set(domains).size).toBe(domains.length);
      expect(domains).toEqual([...domains].sort());
      expect(domains).not.toContain(null);
      expect(domains).not.toContain("");
    });

    /**
     * Public since the study pages shipped: this list is the index of
     * /practice/[domain], and a token requirement would leave the sitemap with
     * nothing to enumerate. It is a list of subject names, not user data.
     */
    it("serves the domain list without a token", async () => {
      const res = await h.execute<{ questionDomains: string[] }>(DOMAINS);

      expect(res.errors).toEqual([]);
      expect(res.data?.questionDomains).toContain("Airspace");
    });
  });

  describe("domainAccuracy", () => {
    it("groups a user's answers by domain and scores each one", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const user = await h.createUser();

      const regs = await seedQuestion(editor.id, "Regulations");
      const regs2 = await seedQuestion(editor.id, "Regulations");
      const wx = await seedQuestion(editor.id, "Weather");

      await answer(user.id, regs.id, true);
      await answer(user.id, regs2.id, true);
      await answer(user.id, wx.id, false);

      const res = await h.execute<{ me: { domainAccuracy: Accuracy[] } }>(
        MY_ACCURACY,
        { token: h.tokenFor(user) },
      );

      expect(res.data?.me.domainAccuracy).toEqual([
        { domain: "Regulations", answered: 2, correct: 2, accuracy: 100 },
        { domain: "Weather", answered: 1, correct: 0, accuracy: 0 },
      ]);
    });

    it("counts attempts rather than distinct questions", async () => {
      // user_responses has no unique (user_id, question_id) and submitAnswer
      // always inserts, so answering the same question twice counts twice.
      // This mirrors users.questions_answered, which counts attempts too.
      const editor = await h.createUser({ role: "EDITOR" });
      const user = await h.createUser();
      const question = await seedQuestion(editor.id, "Loading");

      await answer(user.id, question.id, false);
      await answer(user.id, question.id, true);

      const res = await h.execute<{ me: { domainAccuracy: Accuracy[] } }>(
        MY_ACCURACY,
        { token: h.tokenFor(user) },
      );

      const loading = res.data?.me.domainAccuracy.find(
        (d) => d.domain === "Loading",
      );
      expect(loading).toEqual({
        domain: "Loading",
        answered: 2,
        correct: 1,
        accuracy: 50,
      });
    });

    it("excludes questions that have no domain", async () => {
      const editor = await h.createUser({ role: "EDITOR" });
      const user = await h.createUser();
      const unclassified = await seedQuestion(editor.id, null);

      await answer(user.id, unclassified.id, true);

      const res = await h.execute<{ me: { domainAccuracy: Accuracy[] } }>(
        MY_ACCURACY,
        { token: h.tokenFor(user) },
      );
      expect(res.data?.me.domainAccuracy).toEqual([]);
    });

    it("is empty for a user who has never answered anything", async () => {
      const user = await h.createUser();

      const res = await h.execute<{ me: { domainAccuracy: Accuracy[] } }>(
        MY_ACCURACY,
        { token: h.tokenFor(user) },
      );
      expect(res.data?.me.domainAccuracy).toEqual([]);
    });

    it("lets an admin read another operator's breakdown", async () => {
      const admin = await h.createUser({ role: "ADMIN" });
      const editor = await h.createUser({ role: "EDITOR" });
      const subject = await h.createUser();
      const question = await seedQuestion(editor.id, "Emergency procedures");
      await answer(subject.id, question.id, true);

      const res = await h.execute<{
        user: { domainAccuracy: { domain: string }[] };
      }>(THEIR_ACCURACY, {
        variables: { id: subject.id },
        token: h.tokenFor(admin),
      });

      expect(res.data?.user.domainAccuracy).toEqual([
        { domain: "Emergency procedures" },
      ]);
    });

    it("refuses one ordinary user reading another's, without logging them out", async () => {
      // A permission failure must not carry a logout marker: ApolloWrapper
      // clears the token and redirects on "unauthorized"/"unauthenticated",
      // and this caller is perfectly well authenticated.
      const nosy = await h.createUser();
      const subject = await h.createUser();

      const res = await h.execute(THEIR_ACCURACY, {
        variables: { id: subject.id },
        token: h.tokenFor(nosy),
      });

      const message = res.errors[0]?.message ?? "";
      expect(message).toContain("Forbidden");
      expect(message.toLowerCase()).not.toContain("unauthorized");
      expect(message.toLowerCase()).not.toContain("unauthenticated");
    });
  });
});
