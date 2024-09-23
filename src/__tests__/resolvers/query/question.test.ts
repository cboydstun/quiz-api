// src/__tests__/resolvers/query/question.test.ts

import resolvers from "../../../resolvers";
import { NotFoundError } from "../../../utils/errors";
import Question from "../../../models/Question";

jest.mock("../../../models/Question");

describe("Query resolvers - question", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific question", async () => {
    const mockQuestion = {
      id: "1",
      questionText: "Question 1",
      answers: ["A", "B"],
      correctAnswer: "A",
      hint: "This is a hint",
    };

    (Question.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockQuestion),
    });

    const result = await resolvers.Query.question(null, { id: "1" });

    expect(result).toEqual(mockQuestion);
  });

  it("should throw NotFoundError if question does not exist", async () => {
    (Question.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(
      resolvers.Query.question(null, { id: "999" })
    ).rejects.toThrow(NotFoundError);
  });
});