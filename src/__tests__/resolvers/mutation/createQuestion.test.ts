// src/__tests__/resolvers/mutation/createQuestion.test.ts

import resolvers from "../../../resolvers";
import {
  AuthenticationError,
  ForbiddenError,
} from "../../../utils/errors";
import Question from "../../../models/Question";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

jest.mock("../../../models/Question");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - createQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new question", async () => {
    const mockUser = {
      _id: "123",
      role: "EDITOR",
      email: "editor@example.com",
      username: "editor",
    };
    const input = {
      prompt: "Consider the following question:",
      questionText: "New question",
      answers: ["A", "B", "C"],
      correctAnswer: "A",
      hint: "This is a hint",
      points: 2,
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    const mockQuestionInstance = {
      _id: "new_question_id",
      ...input,
      createdBy: mockUser._id,
      save: jest.fn(),
    };

    (Question as jest.MockedClass<typeof Question>).mockImplementation(
      () => mockQuestionInstance as any
    );

    const mockPopulate = jest.fn().mockResolvedValue({
      ...mockQuestionInstance,
      createdBy: mockUser,
    });

    mockQuestionInstance.save.mockResolvedValue({
      ...mockQuestionInstance,
      populate: mockPopulate,
    });

    const result = await resolvers.Mutation.createQuestion(null, { input }, {
      req: {},
    } as any);

    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
      "SUPER_ADMIN",
      "ADMIN",
      "EDITOR",
    ]);

    expect(Question).toHaveBeenCalledWith({
      ...input,
      createdBy: mockUser._id,
    });

    expect(mockQuestionInstance.save).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalledWith("createdBy");

    expect(result).toEqual({
      id: "new_question_id",
      prompt: "Consider the following question:",
      questionText: "New question",
      answers: ["A", "B", "C"],
      correctAnswer: "A",
      hint: "This is a hint",
      points: 2,
      createdBy: {
        id: "123",
        username: "editor",
      },
    });
  });

  it("should create a new question with default points when not provided", async () => {
    const mockUser = {
      _id: "123",
      role: "EDITOR",
      email: "editor@example.com",
      username: "editor",
    };
    const input = {
      prompt: "Consider the following question:",
      questionText: "New question",
      answers: ["A", "B", "C"],
      correctAnswer: "A",
    };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

    const mockQuestionInstance = {
      _id: "new_question_id",
      ...input,
      points: 1, // Default value
      createdBy: mockUser._id,
      save: jest.fn(),
    };

    (Question as jest.MockedClass<typeof Question>).mockImplementation(
      () => mockQuestionInstance as any
    );

    const mockPopulate = jest.fn().mockResolvedValue({
      ...mockQuestionInstance,
      createdBy: mockUser,
    });

    mockQuestionInstance.save.mockResolvedValue({
      ...mockQuestionInstance,
      populate: mockPopulate,
    });

    const result = await resolvers.Mutation.createQuestion(null, { input }, {
      req: {},
    } as any);

    expect(Question).toHaveBeenCalledWith({
      ...input,
      points: 1, // Default value
      createdBy: mockUser._id,
    });

    expect(result.points).toBe(1);
  });

  it("should throw ForbiddenError for unauthorized users", async () => {
    (authUtils.checkAuth as jest.Mock).mockResolvedValue({
      id: "123",
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
            questionText: "New question",
            answers: ["A", "B", "C"],
            correctAnswer: "A",
          },
        },
        { req: {} } as any
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
