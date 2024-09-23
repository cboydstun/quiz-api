// src/__tests__/resolvers/mutation/updateQuestion.test.ts

import resolvers from "../../../resolvers";
import {
  NotFoundError,
  ForbiddenError,
} from "../../../utils/errors";
import Question from "../../../models/Question";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";
import mongoose from "mongoose";

jest.mock("../../../models/Question");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - updateQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update an existing question", async () => {
    const mockUser = { _id: "123", role: "EDITOR" };
    const mockQuestion = {
      _id: "456",
      questionText: "Old question",
      answers: ["A", "B"],
      correctAnswer: "A",
      save: jest.fn(),
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
    (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

    mockQuestion.save.mockResolvedValue({
      _id: "456",
      questionText: "Updated question",
      answers: ["X", "Y"],
      correctAnswer: "X",
      populate: jest.fn().mockResolvedValue({
        _id: "456",
        questionText: "Updated question",
        answers: ["X", "Y"],
        correctAnswer: "X",
        createdBy: { _id: "123", username: "editor" },
      }),
    });

    const result = await resolvers.Mutation.updateQuestion(
      null,
      {
        id: "456",
        input: {
          questionText: "Updated question",
          answers: ["X", "Y"],
          correctAnswer: "X",
        },
      },
      { req: {} } as any
    );

    expect(result).toEqual({
      _id: "456",
      questionText: "Updated question",
      answers: ["X", "Y"],
      correctAnswer: "X",
      createdBy: { _id: "123", username: "editor" },
    });
  });

  it("should throw NotFoundError if question does not exist", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      _id: "123",
      role: "EDITOR",
    });
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
    (Question.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Mutation.updateQuestion(
        null,
        {
          id: "999",
          input: {
            questionText: "Updated question",
            answers: ["X", "Y"],
            correctAnswer: "X",
          },
        },
        { req: {} } as any
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw NotFoundError for invalid ObjectId", async () => {
    const mockUser = { _id: "123", username: "testuser", role: "EDITOR" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(
      undefined
    );
    (Question.findById as jest.Mock).mockRejectedValue(
      new mongoose.Error.CastError("ObjectId", "invalid-id", "id")
    );

    await expect(
      resolvers.Mutation.updateQuestion(
        null,
        {
          id: "invalid-id",
          input: {
            questionText: "Updated question",
            answers: ["X", "Y"],
            correctAnswer: "X",
          },
        },
        { req: {} } as any
      )
    ).rejects.toThrow(NotFoundError);
  });
});
