import resolvers from "../resolvers";
import {
  UserInputError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import User from "../models/User";
import Question, { IQuestion } from "../models/Question";
import * as authUtils from "../utils/auth";
import * as permissionUtils from "../utils/permissions";
import { Model, Document } from "mongoose";
import mongoose from "mongoose";
import { ApolloError } from "apollo-server-express";
import { OAuth2Client } from "google-auth-library";
import * as googleAuth from "../resolvers/index";  // Import the module containing createOAuth2Client

jest.mock("../models/User");
jest.mock("../utils/auth");
jest.mock("../utils/permissions");
jest.mock("../models/Question");
jest.mock("google-auth-library");

describe("Query resolvers", () => {
  describe("me", () => {
    it("should return the authenticated user", async () => {
      const mockUser = {
        _id: "123",
        id: "123",
        username: "testuser",
        email: "test@example.com",
        role: "USER",
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue({
        _id: "123",
        email: "test@example.com",
        role: "USER",
      });

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolvers.Query.me(null, {}, { req: {} } as any);

      expect(result).toEqual({
        id: "123",
        username: "testuser",
        email: "test@example.com",
        role: "USER",
      });
      expect(authUtils.checkAuth).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith("123");
    });

    it("should throw AuthenticationError if user is not found", async () => {
      (authUtils.checkAuth as jest.Mock).mockResolvedValue({
        _id: "123",
        email: "test@example.com",
        role: "USER",
      });

      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        resolvers.Query.me(null, {}, { req: {} } as any)
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError if not authenticated", async () => {
      (authUtils.checkAuth as jest.Mock).mockRejectedValue(
        new AuthenticationError("Not authenticated")
      );

      await expect(
        resolvers.Query.me(null, {}, { req: {} } as any)
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("users", () => {
    it("should return all users for admin", async () => {
      const mockUsers = [
        {
          id: "1",
          username: "user1",
          email: "user1@example.com",
          role: "USER",
        },
        {
          id: "2",
          username: "user2",
          email: "user2@example.com",
          role: "EDITOR",
        },
      ];
      const mockAdmin = {
        _id: "123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
      (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      const result = await resolvers.Query.users(null, {}, { req: {} } as any);

      expect(result).toEqual(mockUsers);
      expect(authUtils.checkAuth).toHaveBeenCalled();
      expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
        "SUPER_ADMIN",
        "ADMIN",
      ]);
    });

    it("should throw AuthenticationError if not authenticated", async () => {
      (authUtils.checkAuth as jest.Mock).mockRejectedValue(
        new AuthenticationError("Not authenticated")
      );

      await expect(
        resolvers.Query.users(null, {}, { req: {} } as any)
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw ForbiddenError for non-admin users", async () => {
      const mockUser = { _id: "123", email: "user@example.com", role: "USER" };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
      (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
        throw new ForbiddenError(
          "You do not have permission to perform this action"
        );
      });

      await expect(
        resolvers.Query.users(null, {}, { req: {} } as any)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("user", () => {
    it("should return a specific user for admin", async () => {
      const mockUser = {
        _id: { toString: () => "1" },
        username: "user1",
        email: "user1@example.com",
        role: "USER",
      };

      const mockAdmin = {
        _id: "123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
      (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolvers.Query.user(null, { id: "1" }, {
        req: {},
      } as any);

      expect(result).toEqual({
        id: "1",
        username: "user1",
        email: "user1@example.com",
        role: "USER",
      });
      expect(authUtils.checkAuth).toHaveBeenCalled();
      expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, [
        "SUPER_ADMIN",
        "ADMIN",
      ]);
      expect(User.findById).toHaveBeenCalledWith("1");
    });

    it("should throw NotFoundError if user does not exist", async () => {
      const mockAdmin = {
        _id: "123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
      (permissionUtils.checkPermission as jest.Mock).mockReturnValue(undefined);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        resolvers.Query.user(null, { id: "999" }, { req: {} } as any)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("questions", () => {
    it("should return all questions", async () => {
      const mockQuestions = [
        {
          id: "1",
          questionText: "Question 1",
          answers: ["A", "B"],
          correctAnswer: "A",
        },
        {
          id: "2",
          questionText: "Question 2",
          answers: ["X", "Y"],
          correctAnswer: "Y",
        },
      ];

      (Question.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockQuestions),
      });

      const result = await resolvers.Query.questions();

      expect(result).toEqual(mockQuestions);
    });
  });

  describe("question", () => {
    it("should return a specific question", async () => {
      const mockQuestion = {
        id: "1",
        questionText: "Question 1",
        answers: ["A", "B"],
        correctAnswer: "A",
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
});

describe("Mutation resolvers", () => {
  describe("register", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (authUtils.generateToken as jest.Mock).mockReturnValue("dummy_token");
    });

    it("should create a new user when input is valid", async () => {
      const mockUser = {
        _id: "123",
        username: "testuser",
        email: "test@example.com",
        role: "USER",
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as unknown as jest.Mock).mockImplementation(() => mockUser);

      const result = await resolvers.Mutation.register(
        null,
        {
          input: {
            username: "testuser",
            email: "test@example.com",
            password: "password123",
          },
        },
        {} as any
      );

      expect(result.user).toEqual(
        expect.objectContaining({
          username: "testuser",
          email: "test@example.com",
          role: "USER",
        })
      );
      expect(result.token).toBe("dummy_token");
      expect(authUtils.generateToken).toHaveBeenCalledWith(
        expect.objectContaining(mockUser)
      );
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should throw UserInputError when username or email already exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        username: "existinguser",
        email: "existing@example.com",
      });

      await expect(
        resolvers.Mutation.register(
          null,
          {
            input: {
              username: "existinguser",
              email: "existing@example.com",
              password: "password123",
            },
          },
          {} as any
        )
      ).rejects.toThrow(UserInputError);
    });
  });

  describe("login", () => {
    it("should return token and user for valid credentials", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        password: "hashedpassword",
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (authUtils.generateToken as jest.Mock).mockReturnValue("dummy_token");

      const result = await resolvers.Mutation.login(
        null,
        { email: "test@example.com", password: "password123" },
        {} as any
      );

      expect(result).toEqual({
        token: "dummy_token",
        user: mockUser,
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
    });

    it("should throw AuthenticationError for invalid credentials", async () => {
      const mockUser = {
        email: "test@example.com",
        password: "hashedpassword",
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        resolvers.Mutation.login(
          null,
          { email: "test@example.com", password: "wrongpassword" },
          {} as any
        )
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("createQuestion", () => {
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
      };

      // Mock auth and permission checks
      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
      (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);

      // Create a mock for the new Question instance
      const mockQuestionInstance = {
        _id: "new_question_id",
        ...input,
        createdBy: mockUser._id,
        save: jest.fn().mockResolvedValue({
          _id: "new_question_id",
          ...input,
          createdBy: mockUser._id,
        }),
      };

      // Mock the Question constructor
      (Question as jest.MockedClass<typeof Question>).mockImplementation(
        () => mockQuestionInstance as any
      );

      // Mock the populate method to return the full user object
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: "new_question_id",
        ...input,
        createdBy: mockUser,
      });

      // Attach the populate mock to the save result
      mockQuestionInstance.save.mockResolvedValue({
        ...mockQuestionInstance,
        populate: mockPopulate,
      });

      // Call the resolver
      const result = await resolvers.Mutation.createQuestion(null, { input }, {
        req: {},
      } as any);

      // Validate that auth checks were called
      expect(authUtils.checkAuth).toHaveBeenCalled();
      expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, [
        "SUPER_ADMIN",
        "ADMIN",
        "EDITOR",
      ]);

      // Validate that new Question was created with correct data
      expect(Question).toHaveBeenCalledWith({
        ...input,
        createdBy: mockUser._id,
      });

      // Validate that save and populate were called
      expect(mockQuestionInstance.save).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith("createdBy");

      // Validate the result
      expect(result).toEqual({
        id: "new_question_id",
        prompt: "Consider the following question:",
        questionText: "New question",
        answers: ["A", "B", "C"],
        correctAnswer: "A",
        createdBy: {
          id: "123",
          username: "editor",
        },
      });
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

  describe("updateQuestion", () => {
    it("should update an existing question", async () => {
      const mockUser = { _id: "123", role: "EDITOR" };
      const mockQuestion = {
        _id: "456",
        questionText: "Old question",
        answers: ["A", "B"],
        correctAnswer: "A",
        save: jest.fn().mockResolvedValue({
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
        }),
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
      (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
      (Question.findById as jest.Mock).mockResolvedValue(mockQuestion);

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

  describe("deleteQuestion", () => {
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

    it("should throw NotFoundError if question does not exist", async () => {
      (authUtils.checkAuth as jest.Mock).mockResolvedValue({
        id: "123",
        role: "EDITOR",
      });
      (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
      (Question.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

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

    describe("deleteUser", () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });
  
      it("should delete a user when called by an admin or super admin", async () => {
        const mockAdmin = { _id: "123", role: "ADMIN", email: "admin@example.com" };
        const mockUser = { _id: "456", username: "testuser", role: "USER" };
  
        // Mock the necessary utility functions
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
        (permissionUtils.checkPermission as jest.Mock).mockReturnValue(true);
        (User.findById as jest.Mock).mockResolvedValue(mockUser);
        (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);
  
        // Call the mutation resolver
        const result = await resolvers.Mutation.deleteUser(
          null,
          { userId: "456" },
          { req: {} } as any
        );
  
        // Expectations
        expect(result).toBe(true);
        expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
        expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, ["SUPER_ADMIN", "ADMIN"]);
        expect(User.findById).toHaveBeenCalledWith("456");
        expect(User.findByIdAndDelete).toHaveBeenCalledWith("456");
      });
  
      it("should throw NotFoundError if the user to be deleted does not exist", async () => {
        const mockAdmin = { _id: "123", role: "ADMIN", email: "admin@example.com" };
  
        // Mock the necessary utility functions
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
        (permissionUtils.checkPermission as jest.Mock).mockReturnValue(true);
        (User.findById as jest.Mock).mockResolvedValue(null); // User does not exist
  
        // Call the mutation resolver and assert that it throws an error
        await expect(
          resolvers.Mutation.deleteUser(null, { userId: "999" }, { req: {} } as any)
        ).rejects.toThrow(NotFoundError);
  
        // Expectations
        expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
        expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, ["SUPER_ADMIN", "ADMIN"]);
        expect(User.findById).toHaveBeenCalledWith("999");
      });
  
      it("should throw ForbiddenError if attempting to delete a SUPER_ADMIN", async () => {
        const mockAdmin = { _id: "123", role: "ADMIN", email: "admin@example.com" };
        const mockSuperAdmin = { _id: "456", role: "SUPER_ADMIN", username: "superadminuser" };
  
        // Mock the necessary utility functions
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
        (permissionUtils.checkPermission as jest.Mock).mockReturnValue(true);
        (User.findById as jest.Mock).mockResolvedValue(mockSuperAdmin); // Trying to delete SUPER_ADMIN
  
        // Call the mutation resolver and assert that it throws a ForbiddenError
        await expect(
          resolvers.Mutation.deleteUser(null, { userId: "456" }, { req: {} } as any)
        ).rejects.toThrow(ForbiddenError);
  
        // Expectations
        expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
        expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockAdmin, ["SUPER_ADMIN", "ADMIN"]);
        expect(User.findById).toHaveBeenCalledWith("456");
      });
  
      it("should throw AuthenticationError if the user is not authenticated", async () => {
        // Mock the authentication utility to throw an error
        (authUtils.checkAuth as jest.Mock).mockRejectedValue(new AuthenticationError("Not authenticated"));
  
        // Call the mutation resolver and assert that it throws an AuthenticationError
        await expect(
          resolvers.Mutation.deleteUser(null, { userId: "456" }, { req: {} } as any)
        ).rejects.toThrow(AuthenticationError);
  
        // Expectations
        expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
        expect(permissionUtils.checkPermission).not.toHaveBeenCalled();
        expect(User.findById).not.toHaveBeenCalled();
      });
  
      it("should throw ForbiddenError if the user does not have sufficient permissions", async () => {
        const mockUser = { _id: "123", role: "USER", email: "user@example.com" };
  
        // Mock the necessary utility functions
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
        (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
          throw new ForbiddenError("Not authorized");
        });
  
        // Call the mutation resolver and assert that it throws a ForbiddenError
        await expect(
          resolvers.Mutation.deleteUser(null, { userId: "456" }, { req: {} } as any)
        ).rejects.toThrow(ForbiddenError);
  
        // Expectations
        expect(authUtils.checkAuth).toHaveBeenCalledWith({ req: {} });
        expect(permissionUtils.checkPermission).toHaveBeenCalledWith(mockUser, ["SUPER_ADMIN", "ADMIN"]);
        expect(User.findById).not.toHaveBeenCalled();
      });
    });
  });

  describe("changeUserRole", () => {
    it("should change a user's role", async () => {
      const mockAdmin = { id: "123", role: "ADMIN" };
      const mockUser = { id: "456", role: "USER" };
      const updatedUser = { ...mockUser, role: "EDITOR" };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
      (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

      const result = await resolvers.Mutation.changeUserRole(
        null,
        { userId: "456", newRole: "EDITOR" },
        { req: {} } as any
      );

      expect(result).toEqual(updatedUser);
      expect(authUtils.checkAuth).toHaveBeenCalled();
      expect(permissionUtils.checkPermission).toHaveBeenCalledWith(
        expect.anything(),
        ["SUPER_ADMIN", "ADMIN"]
      );
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "456",
        { role: "EDITOR" },
        { new: true }
      );
    });

    it("should throw NotFoundError if user does not exist", async () => {
      (authUtils.checkAuth as jest.Mock).mockResolvedValue({
        id: "123",
        role: "ADMIN",
      });
      (permissionUtils.checkPermission as jest.Mock).mockResolvedValue(true);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        resolvers.Mutation.changeUserRole(
          null,
          { userId: "999", newRole: "EDITOR" },
          { req: {} } as any
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError if trying to change to SUPER_ADMIN role", async () => {
      const mockAdmin = {
        _id: "123",
        role: "ADMIN",
        email: "admin@example.com",
        username: "adminuser",
      };
      const mockUser = {
        _id: "456",
        role: "USER",
        email: "user@example.com",
        username: "regularuser",
      };

      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockAdmin);
      (permissionUtils.checkPermission as jest.Mock).mockImplementation(() => {
        throw new ForbiddenError("Cannot change role to SUPER_ADMIN");
      });
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        resolvers.Mutation.changeUserRole(
          null,
          { userId: "456", newRole: "SUPER_ADMIN" },
          { req: {} } as any
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("getGoogleAuthUrl", () => {
    let mockGenerateAuthUrl: jest.Mock;
    let mockClient: any;

    beforeEach(() => {
      mockGenerateAuthUrl = jest.fn();
      mockClient = { generateAuthUrl: mockGenerateAuthUrl };
      
      // Mock the createOAuth2Client function
      jest.spyOn(googleAuth, 'createOAuth2Client').mockReturnValue(mockClient);
      
      // Reset the client in the resolver
      (googleAuth as any).client = mockClient;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return a valid Google Auth URL", async () => {
      const mockUrl = "https://accounts.google.com/o/oauth2/v2/auth?...";
      mockGenerateAuthUrl.mockResolvedValue(mockUrl);

      const result = await resolvers.Query.getGoogleAuthUrl();

      expect(result).toEqual({ url: mockUrl });
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['profile', 'email']
      });
    });

    it("should throw ApolloError when generateAuthUrl fails", async () => {
      mockGenerateAuthUrl.mockRejectedValue(new Error("Failed to generate URL"));

      await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow(ApolloError);
      await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow("Failed to generate Google Auth URL");
    });

    it("should throw ApolloError when generateAuthUrl returns null", async () => {
      mockGenerateAuthUrl.mockResolvedValue(null);

      await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow(ApolloError);
      await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow("Failed to generate Google Auth URL");
    });
  });
});
