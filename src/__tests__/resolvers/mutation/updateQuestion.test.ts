// src/__tests__/resolvers/mutation/updateQuestion.test.ts

import mongoose from "mongoose";
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
  email?: string;
  username?: string;
}

describe("Mutation resolvers - updateQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update an existing question", async () => {
    const mockUser: MockUser = {
      _id: "123456789012345678901234",
      role: "EDITOR",
      username: "editor"
    };

    const mockQuestion = {
      _id: new Types.ObjectId("123456789012345678901234"),
      prompt: "Old prompt",
      questionText: "Old question",
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
        text: "Old reference"
      }],
      learningObjectives: ["Old objective"],
      tags: ["old-tag"],
      points: 1,
      feedback: {
        correct: "Old correct feedback",
        incorrect: "Old incorrect feedback"
      },
      metadata: {
        createdBy: mockUser._id,
        lastModifiedBy: mockUser._id,
        version: 1,
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      stats: {
        timesAnswered: 0,
        correctAnswers: 0,
        averageTimeToAnswer: 0,
        difficultyRating: 3
      },
      save: jest.fn(),
    };

    const updateInput = {
      prompt: "Updated prompt",
      questionText: "Updated question",
      answers: [
        { text: "X", isCorrect: true, explanation: "This is now correct" },
        { text: "Y", isCorrect: false, explanation: "This is now incorrect" }
      ],
      difficulty: "intermediate" as QuestionDifficulty,
      type: "multiple_choice" as QuestionType,
      topics: {
        mainTopic: "TypeScript",
        subTopics: ["Advanced Types"]
      },
      sourceReferences: [{
        page: 2,
        lines: { start: 10, end: 15 },
        text: "Updated reference"
      }],
      learningObjectives: ["Updated objective"],
      tags: ["updated-tag"],
      points: 2,
      feedback: {
        correct: "Updated correct feedback",
        incorrect: "Updated incorrect feedback"
      }
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    const updatedQuestion = {
      ...mockQuestion,
      ...updateInput,
      metadata: {
        ...mockQuestion.metadata,
        lastModifiedBy: mockUser._id,
        version: 2,
        updatedAt: new Date()
      }
    };

    mockQuestion.save.mockResolvedValue(updatedQuestion);

    const mockPopulatedQuestion = {
      ...updatedQuestion,
      metadata: {
        ...updatedQuestion.metadata,
        createdBy: mockUser,
        lastModifiedBy: mockUser
      }
    };

    // Setup the mock chain for both findById calls
    const mockPopulate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPopulatedQuestion)
        })
      })
    });

    // Initial findById returns the plain question
    (Question.findById as jest.Mock).mockImplementation((queryId) => {
      if (queryId === "123456789012345678901234") {
        return {
          ...mockQuestion,
          metadata: { ...mockQuestion.metadata }  // Ensure metadata is properly cloned
        };
      }
      // For the populated query after save
      return {
        populate: mockPopulate
      };
    });

    const result = await resolvers.Mutation.updateQuestion(
      null,
      {
        id: "123456789012345678901234",
        input: updateInput,
      },
      { req: {} } as any
    );

    expect(result).toEqual(mockPopulatedQuestion);
    expect(mockQuestion.save).toHaveBeenCalled();
  });

  it("should throw NotFoundError if question does not exist", async () => {
    const mockUser = {
      _id: "123456789012345678901234",
      role: "EDITOR",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
    (Question.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Mutation.updateQuestion(
        null,
        {
          id: "123456789012345678901235",
          input: {
            prompt: "Updated prompt",
            questionText: "Updated question",
            answers: [
              { text: "X", isCorrect: true },
              { text: "Y", isCorrect: false }
            ],
            difficulty: "basic",
            type: "multiple_choice",
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
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError for invalid ObjectId", async () => {
    const mockUser = {
      _id: "123456789012345678901234",
      role: "EDITOR",
      username: "editor"
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    // Mock a Mongoose CastError instead of a generic Error
    const castError = new mongoose.Error.CastError(
      'ObjectId',
      'invalid-id',
      'id'
    );

    (Question.findById as jest.Mock).mockRejectedValue(castError);

    await expect(
      resolvers.Mutation.updateQuestion(
        null,
        {
          id: "invalid-id",
          input: {
            prompt: "Updated prompt",
            questionText: "Updated question",
            answers: [
              { text: "X", isCorrect: true },
              { text: "Y", isCorrect: false }
            ],
            difficulty: "basic",
            type: "multiple_choice",
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
    ).rejects.toThrow(NotFoundError);
  });
});
