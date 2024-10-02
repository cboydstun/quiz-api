// src/__tests__/resolvers/mutation/deleteQuestion.test.ts

import resolvers from "../../../resolvers";
import {
  NotFoundError,
} from "../../../utils/errors";
import Question from "../../../models/Question";
import * as authUtils from "../../../utils/auth";
import * as permissionUtils from "../../../utils/permissions";

jest.mock("../../../models/Question");
jest.mock("../../../utils/auth");
jest.mock("../../../utils/permissions");

describe("Mutation resolvers - deleteQuestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete an existing question", async () => {
    const mockUser = { _id: "123", username: "testuser", role: "ADMIN" };
    const mockQuestion = { _id: "456", questionText: "Test question" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(
      undefined
    );
    (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);
    (Question.findByIdAndDelete as jest.Mock).mockResolvedValue(mockQuestion);

    const result = await resolvers.Mutation.deleteQuestion(
      null,
      { id: "456" },
      { req: {} } as any
    );

    expect(result).toBe(true);
    expect(authUtils.checkAuth).toHaveBeenCalled();
    expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
      "SUPER_ADMIN",
      "ADMIN",
      "EDITOR",
    ]);
    expect(Question.findById).toHaveBeenCalledWith("456");
    expect(Question.findByIdAndDelete).toHaveBeenCalledWith("456");
  });

  it("should throw NotFoundError if question does not exist", async () => {
    const mockUser = { _id: "123", username: "testuser", role: "ADMIN" };

    (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(
      undefined
    );
    (Question.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      resolvers.Mutation.deleteQuestion(null, { id: "999" }, {
        req: {},
      } as any)
    ).rejects.toThrow(NotFoundError);
  });
});
