// src/__tests__/resolvers/mutation/deleteQuestion.test.ts

import resolvers from "../../../resolvers";
import { NotFoundError } from "../../../utils/errors";
import Question from "../../../models/Question";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";
import { Types } from "mongoose";

jest.mock("../../../models/Question");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

type QuestionDifficulty = 'basic' | 'intermediate' | 'advanced';
type QuestionType = 'multiple_choice' | 'true-false' | 'fill-in-blank';

interface MockUser {
  _id: string;
  role: string;
  username: string;
}

describe("Mutation resolvers - deleteQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete an existing question", async () => {
    const mockUser: MockUser = {
      _id: "123456789012345678901234",
      username: "testuser",
      role: "ADMIN"
    };

    const mockQuestion = {
      _id: new Types.ObjectId("123456789012345678901234"),
      prompt: "Test prompt",
      questionText: "Test question",
      answers: [
        { text: "A", isCorrect: true, explanation: "This is correct" },
        { text: "B", isCorrect: false, explanation: "This is incorrect" }
      ],
      difficulty: "basic" as QuestionDifficulty,
      type: "multiple_choice" as QuestionType,
      topics: {
        mainTopic: "Programming",
        subTopics: ["JavaScript"]
      },
      sourceReferences: [{
        page: 1,
        lines: { start: 1, end: 5 },
        text: "Reference text"
      }],
      learningObjectives: ["Learn JavaScript"],
      tags: ["programming", "javascript"],
      hint: "This is a hint",
      points: 1,
      feedback: {
        correct: "Great job!",
        incorrect: "Try again!"
      },
      metadata: {
        createdBy: mockUser,
        lastModifiedBy: mockUser,
        version: 1,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      }
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(undefined);
    (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);
    (Question.findByIdAndDelete as jest.Mock).mockResolvedValue(mockQuestion);

    const result = await resolvers.Mutation.deleteQuestion(
      null,
      { id: "123456789012345678901234" },
      { req: {} } as any
    );

    expect(result).toBe(true);
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
      "SUPER_ADMIN",
      "ADMIN",
      "EDITOR",
    ]);
    expect(Question.findById).toHaveBeenCalledWith("123456789012345678901234");
    expect(Question.findByIdAndDelete).toHaveBeenCalledWith("123456789012345678901234");
  });

  it("should throw NotFoundError if question does not exist", async () => {
    const mockUser: MockUser = {
      _id: "123456789012345678901234",
      username: "testuser",
      role: "ADMIN"
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(undefined);
    (Question.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Mutation.deleteQuestion(
        null,
        { id: "123456789012345678901234" },
        { req: {} } as any
      )
    ).rejects.toThrow(NotFoundError);
  });
});
