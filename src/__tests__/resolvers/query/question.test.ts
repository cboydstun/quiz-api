import { Types } from "mongoose";
import questionResolvers from "../../../resolvers/questionResolvers";
import Question from "../../../models/Question";
import { NotFoundError } from "../../../utils/errors";

// Mock the Question model
jest.mock("../../../models/Question");

interface MockQuestionData {
  _id: Types.ObjectId;
  prompt: string;
  questionText: string;
  answers: Array<{
    text: string;
    correct: boolean;
  }>;
  difficulty: string;
  type: string;
  points: number;
  topics: string[];
  feedback: {
    correct: string;
    incorrect: string;
  };
  metadata: {
    createdBy: Types.ObjectId;
    lastModifiedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
  relatedQuestions?: Types.ObjectId[];
}

describe("Query resolvers - question", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific question", async () => {
    const mockQuestion: MockQuestionData = {
      _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
      prompt: "Test prompt",
      questionText: "Question 1",
      answers: [
        { text: "Answer 1", correct: true },
        { text: "Answer 2", correct: false },
      ],
      difficulty: "basic",
      type: "multiple_choice",
      points: 10,
      topics: ["math"],
      feedback: {
        correct: "Good job!",
        incorrect: "Try again",
      },
      metadata: {
        createdBy: new Types.ObjectId("507f1f77bcf86cd799439012"),
        lastModifiedBy: new Types.ObjectId("507f1f77bcf86cd799439013"),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    };

    (Question.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockQuestion)
          })
        })
      })
    });

    const result = await questionResolvers.Query.question(
      null,
      { id: mockQuestion._id.toString() },
      {} as any
    );

    expect(result).toEqual(mockQuestion);
    expect(Question.findById).toHaveBeenCalledWith(mockQuestion._id.toString());
  });

  it("should throw NotFoundError if question doesn't exist", async () => {
    (Question.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null)
          })
        })
      })
    });

    await expect(
      questionResolvers.Query.question(null, { id: "507f1f77bcf86cd799439011" }, {} as any)
    ).rejects.toThrow(NotFoundError);
  });

  it("should populate related questions", async () => {
    const relatedQuestionId = new Types.ObjectId("507f1f77bcf86cd799439014");
    const relatedQuestion: Partial<MockQuestionData> = {
      _id: relatedQuestionId,
      prompt: "Related prompt",
      questionText: "Related Question",
      difficulty: "basic",
      type: "multiple_choice",
      points: 10,
    };

    const mockQuestion: MockQuestionData = {
      _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
      prompt: "Test prompt",
      questionText: "Question 1",
      answers: [
        { text: "Answer 1", correct: true },
        { text: "Answer 2", correct: false },
      ],
      difficulty: "basic",
      type: "multiple_choice",
      points: 10,
      topics: ["math"],
      feedback: {
        correct: "Good job!",
        incorrect: "Try again",
      },
      metadata: {
        createdBy: new Types.ObjectId("507f1f77bcf86cd799439012"),
        lastModifiedBy: new Types.ObjectId("507f1f77bcf86cd799439013"),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      relatedQuestions: [relatedQuestionId],
    };

    const populatedQuestion = {
      ...mockQuestion,
      relatedQuestions: [relatedQuestion],
    };

    (Question.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(populatedQuestion)
          })
        })
      })
    });

    const result = await questionResolvers.Query.question(
      null,
      { id: mockQuestion._id.toString() },
      {} as any
    );

    expect(result).toEqual(populatedQuestion);
  });
});
