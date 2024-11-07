// src/__tests__/resolvers/mutation/createQuestion.test.ts

import resolvers from "../../../resolvers";
import { ForbiddenError } from "../../../utils/errors";
import Question, { IQuestion } from "../../../models/Question";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";
import { Document, Model, Types } from "mongoose";

jest.mock("../../../models/Question");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

type QuestionDifficulty = 'basic' | 'intermediate' | 'advanced';
type QuestionType = 'multiple_choice' | 'true-false' | 'fill-in-blank';

interface MockUser {
  _id: string;
  role: string;
  email: string;
  username: string;
}

interface MockQuestion extends Omit<IQuestion, 'metadata'> {
  _id: Types.ObjectId;
  metadata: {
    createdBy: string | MockUser;
    lastModifiedBy: string | MockUser;
    version: number;
    status: 'draft' | 'review' | 'active' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  };
  save: jest.Mock;
}

describe("Mutation resolvers - createQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new question", async () => {
    const mockUser: MockUser = {
      _id: "123456789012345678901234",
      role: "EDITOR",
      email: "editor@example.com",
      username: "editor",
    };

    const input = {
      prompt: "Consider the following question:",
      questionText: "New question",
      answers: [
        { text: "A", isCorrect: true, explanation: "This is correct" },
        { text: "B", isCorrect: false, explanation: "This is incorrect" }
      ],
      difficulty: "basic" as QuestionDifficulty,
      type: "multiple_choice" as QuestionType,
      topics: {
        mainTopic: "Programming",
        subTopics: ["JavaScript", "TypeScript"]
      },
      sourceReferences: [{
        page: 1,
        chapter: "Introduction",
        lines: { start: 1, end: 5 },
        text: "Reference text"
      }],
      learningObjectives: ["Learn TypeScript"],
      tags: ["programming", "typescript"],
      hint: "This is a hint",
      points: 2,
      feedback: {
        correct: "Great job!",
        incorrect: "Try again!"
      }
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    const mockSave = jest.fn();

    const mockQuestionData = {
      _id: new Types.ObjectId("123456789012345678901235"),
      ...input,
      metadata: {
        createdBy: mockUser._id,
        lastModifiedBy: (mockUser as MockUser)._id,
        version: 1,
        status: 'draft' as 'draft' | 'review' | 'active' | 'archived',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      },
      save: mockSave
    };

    const mockPopulatedQuestion: Partial<MockQuestion> = {
      ...mockQuestionData,
      metadata: {
        ...mockQuestionData.metadata,
        createdBy: mockUser,
        lastModifiedBy: mockUser
      }
    };

    (Question as unknown as jest.Mock).mockImplementation(() => mockQuestionData as MockQuestion);

    (Question.findById as jest.Mock) = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPopulatedQuestion)
          })
        })
      })
    });

    mockSave.mockResolvedValue(mockQuestionData);

    const result = await resolvers.Mutation.createQuestion(null, { input }, {
      req: {},
    } as any) as MockQuestion;

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
      "SUPER_ADMIN",
      "ADMIN",
      "EDITOR",
    ]);

    expect(Question).toHaveBeenCalledWith({
      ...input,
      metadata: {
        createdBy: mockUser._id,
        lastModifiedBy: mockUser._id,
        version: 1,
        status: 'draft'
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      }
    });

    expect(mockSave).toHaveBeenCalled();
    expect(result).toEqual(mockPopulatedQuestion);
  });

  it("should create a new question with default points when not provided", async () => {
    const mockUser: MockUser = {
      _id: "123456789012345678901234",
      role: "EDITOR",
      email: "editor@example.com",
      username: "editor",
    };

    const input = {
      prompt: "Consider the following question:",
      questionText: "New question",
      answers: [
        { text: "A", isCorrect: true, explanation: "This is correct" },
        { text: "B", isCorrect: false, explanation: "This is incorrect" }
      ],
      difficulty: "basic" as QuestionDifficulty,
      type: "multiple_choice" as QuestionType,
      topics: {
        mainTopic: "Programming",
        subTopics: ["JavaScript", "TypeScript"]
      },
      sourceReferences: [{
        page: 1,
        chapter: "Introduction",
        lines: { start: 1, end: 5 },
        text: "Reference text"
      }],
      learningObjectives: ["Learn TypeScript"],
      tags: ["programming", "typescript"],
      feedback: {
        correct: "Great job!",
        incorrect: "Try again!"
      }
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    const mockSave = jest.fn();

    const mockQuestionData = {
      _id: new Types.ObjectId("123456789012345678901235"),
      ...input,
      points: 1, // Default value
      metadata: {
        createdBy: mockUser._id,
        lastModifiedBy: mockUser._id,
        version: 1,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      },
      save: mockSave
    };

    const mockPopulatedQuestion: Partial<MockQuestion> = {
      ...mockQuestionData,
      metadata: {
        ...mockQuestionData.metadata,
        createdBy: mockUser,
        lastModifiedBy: mockUser,
        version: 1,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    (Question as unknown as jest.Mock).mockImplementation(() => mockQuestionData as MockQuestion);

    (Question.findById as jest.Mock) = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockPopulatedQuestion)
          })
        })
      })
    });

    mockSave.mockResolvedValue(mockQuestionData);

    const result = await resolvers.Mutation.createQuestion(null, { input }, {
      req: {},
    } as any);

    expect(Question).toHaveBeenCalledWith({
      ...input,
      points: 1,
      metadata: {
        createdBy: mockUser._id,
        lastModifiedBy: mockUser._id,
        version: 1,
        status: 'draft'
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      }
    });

    expect((result as MockQuestion).points).toBe(1);
  });

  it("should throw ForbiddenError for unauthorized users", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      id: "123456789012345678901234",
      role: "USER",
    });
    (permissionUtils.checkPermission as jest.Mock).mockRejectedValue(
      new ForbiddenError("Not authorized")
    );

    await expect(
      resolvers.Mutation.createQuestion(
        null,
        {
          input: {
            prompt: "Test prompt",
            questionText: "Test question",
            answers: [
              { text: "A", isCorrect: true },
              { text: "B", isCorrect: false }
            ],
            difficulty: "basic" as QuestionDifficulty,
            type: "multiple_choice" as QuestionType,
            topics: {
              mainTopic: "Test",
              subTopics: ["SubTest"]
            },
            sourceReferences: [{
              page: 1,
              lines: { start: 1, end: 5 },
              text: "Reference"
            }],
            learningObjectives: ["Test objective"],
            tags: ["test"],
            feedback: {
              correct: "Correct!",
              incorrect: "Incorrect!"
            }
          },
        },
        { req: {} } as any
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
