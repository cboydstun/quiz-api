// src/__tests__/integration/userResponses.integration.test.ts
import { ApolloServer } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User from "../../models/User";
import Question from "../../models/Question";
import UserResponse from "../../models/UserResponse";
import { generateToken } from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const SUBMIT_ANSWER = `
  mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
    submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
      success
      isCorrect
    }
  }
`;

const GET_USER_RESPONSES = `
  query GetUserResponses {
    userResponses {
      questionId {
        id
        prompt
      }
      selectedAnswer
      isCorrect
    }
  }
`;

const createMockContext = (user: any): ExpressContext => {
  const token = generateToken(user);
  return {
    req: {
      headers: {
        authorization: `Bearer ${token}`, // Ensure the authorization header is set correctly
      },
      get: (name: string) =>
        name === "authorization" ? `Bearer ${token}` : "",
      header: (name: string) =>
        name === "authorization" ? `Bearer ${token}` : "",
      user,
    } as unknown as Request,
    res: {} as Response,
  };
};

describe("User Response Operations Integration Tests", () => {
  let server: ApolloServer<ExpressContext>;
  let adminUser: any;
  let regularUser: any;
  let question: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    process.env.JWT_SECRET = "test-secret";

    server = new ApolloServer<ExpressContext>({
      typeDefs,
      resolvers,
      context: ({ req, res }) => ({ req, res }),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Question.deleteMany({});
    await UserResponse.deleteMany({});

    adminUser = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "adminpass",
      role: "ADMIN",
    });

    regularUser = await User.create({
      username: "user",
      email: "user@example.com",
      password: "userpass",
      role: "USER",
    });

    question = await Question.create({
      prompt: "What is the capital of France?",
      questionText: "What is the capital of France?",
      answers: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: "Paris",
      createdBy: adminUser._id,
    });
  });

  describe("Submit Answer Mutation", () => {
    it("should allow a user to submit a correct answer", async () => {
      const res = await server.executeOperation(
        {
          query: SUBMIT_ANSWER,
          variables: {
            questionId: question._id.toString(),
            selectedAnswer: "Paris",
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.submitAnswer.success).toBe(true);
      expect(res.data?.submitAnswer.isCorrect).toBe(true);

      // Verify the user response was saved
      const userResponse = await UserResponse.findOne({
        userId: regularUser._id,
        questionId: question._id,
      });

      expect(userResponse).not.toBeNull();
      expect(userResponse?.selectedAnswer).toBe("Paris");
      expect(userResponse?.isCorrect).toBe(true);
    });

    it("should allow a user to submit an incorrect answer", async () => {
      const res = await server.executeOperation(
        {
          query: SUBMIT_ANSWER,
          variables: {
            questionId: question._id.toString(),
            selectedAnswer: "Berlin",
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.submitAnswer.success).toBe(true);
      expect(res.data?.submitAnswer.isCorrect).toBe(false);

      // Verify the user response was saved
      const userResponse = await UserResponse.findOne({
        userId: regularUser._id,
        questionId: question._id,
      });

      expect(userResponse).not.toBeNull();
      expect(userResponse?.selectedAnswer).toBe("Berlin");
      expect(userResponse?.isCorrect).toBe(false);
    });
  });

  describe("User Responses Query", () => {
    it("should fetch all user responses for the authenticated user", async () => {
      // Pre-create a user response
      await UserResponse.create({
        userId: regularUser._id,
        questionId: question._id,
        selectedAnswer: "Paris",
        isCorrect: true,
      });

      // Execute the GraphQL query
      const res = await server.executeOperation(
        {
          query: GET_USER_RESPONSES,
        },
        createMockContext(regularUser) // Pass in the mock context with the regular user
      );

      // Ensure no errors and verify the response
      expect(res.errors).toBeUndefined();
      expect(res.data?.userResponses).toHaveLength(1);
      expect(res.data?.userResponses[0].questionId.prompt).toBe(
        "What is the capital of France?"
      );
      expect(res.data?.userResponses[0].selectedAnswer).toBe("Paris");
      expect(res.data?.userResponses[0].isCorrect).toBe(true);
    });
  });
});
