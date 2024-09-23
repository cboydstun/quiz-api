// src/__tests__/resolvers/query/questions.test.ts

import resolvers from "../../../resolvers";
import Question from "../../../models/Question";

jest.mock("../../../models/Question");

describe("Query resolvers - questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all questions", async () => {
    const mockQuestions = [
      {
        id: "1",
        questionText: "Question 1",
        answers: ["A", "B"],
        correctAnswer: "A",
        hint: "Hint 1",
      },
      {
        id: "2",
        questionText: "Question 2",
        answers: ["X", "Y"],
        correctAnswer: "Y",
        hint: "Hint 2",
      },
    ];

    (Question.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockQuestions),
    });

    const result = await resolvers.Query.questions();

    expect(result).toEqual(mockQuestions);
  });
});