import { ApolloServer } from "apollo-server-express";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ExpressContext } from "apollo-server-express/dist/ApolloServer";
import typeDefs from "../../schema";
import resolvers from "../../resolvers";
import User from "../../models/User";
import Question from "../../models/Question";
import { generateToken } from "../../utils/auth";

let mongoServer: MongoMemoryServer;

const CREATE_QUESTION = `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      prompt
      questionText
      answers {
        text
        isCorrect
        explanation
      }
      difficulty
      type
      topics {
        mainTopic
        subTopics
      }
      sourceReferences {
        page
        lines {
          start
          end
        }
        text
      }
      learningObjectives
      tags
      hint
      points
      feedback {
        correct
        incorrect
      }
      metadata {
        createdBy {
          id
          username
        }
        lastModifiedBy {
          id
          username
        }
        version
        status
      }
    }
  }
`;

const GET_QUESTIONS = `
  query GetQuestions {
    questions {
      id
      prompt
      questionText
      answers {
        text
        isCorrect
        explanation
      }
      difficulty
      type
      topics {
        mainTopic
        subTopics
      }
      sourceReferences {
        page
        lines {
          start
          end
        }
        text
      }
      learningObjectives
      tags
      hint
      points
      feedback {
        correct
        incorrect
      }
      metadata {
        createdBy {
          id
          username
        }
        lastModifiedBy {
          id
          username
        }
        version
        status
      }
    }
  }
`;

const GET_QUESTION = `
  query GetQuestion($id: ID!) {
    question(id: $id) {
      id
      prompt
      questionText
      answers {
        text
        isCorrect
        explanation
      }
      difficulty
      type
      topics {
        mainTopic
        subTopics
      }
      sourceReferences {
        page
        lines {
          start
          end
        }
        text
      }
      learningObjectives
      tags
      hint
      points
      feedback {
        correct
        incorrect
      }
      metadata {
        createdBy {
          id
          username
        }
        lastModifiedBy {
          id
          username
        }
        version
        status
      }
    }
  }
`;

const UPDATE_QUESTION = `
  mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
    updateQuestion(id: $id, input: $input) {
      id
      prompt
      questionText
      answers {
        text
        isCorrect
        explanation
      }
      difficulty
      type
      topics {
        mainTopic
        subTopics
      }
      sourceReferences {
        page
        lines {
          start
          end
        }
        text
      }
      learningObjectives
      tags
      hint
      points
      feedback {
        correct
        incorrect
      }
      metadata {
        createdBy {
          id
          username
        }
        lastModifiedBy {
          id
          username
        }
        version
        status
      }
    }
  }
`;

const DELETE_QUESTION = `
  mutation DeleteQuestion($id: ID!) {
    deleteQuestion(id: $id)
  }
`;

const createMockContext = (user: any): ExpressContext => {
  const token = generateToken(user);
  return {
    req: {
      headers: {
        authorization: `Bearer ${token}`,
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

describe("Question Operations Integration Tests", () => {
  let server: ApolloServer<ExpressContext>;
  let adminUser: any;
  let editorUser: any;
  let regularUser: any;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: `testdb_${Date.now()}`,
        },
      });

      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);

      process.env.JWT_SECRET = "test-secret";

      const mockResolvers = {
        ...resolvers,
        Query: {
          ...resolvers.Query,
          getGoogleAuthUrl: () => ({ url: "http://mock-google-auth-url.com" }),
        },
      };

      server = new ApolloServer<ExpressContext>({
        typeDefs,
        resolvers: mockResolvers,
        context: ({ req, res }) => ({ req, res }),
      });
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  }, 60000);

  afterAll(async () => {
    try {
      await mongoose.disconnect();
      await mongoServer.stop();
      delete process.env.JWT_SECRET;
    } catch (error) {
      console.error('Error in test teardown:', error);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Question.deleteMany({});

    adminUser = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "adminpass",
      role: "ADMIN",
    });

    editorUser = await User.create({
      username: "editor",
      email: "editor@example.com",
      password: "editorpass",
      role: "EDITOR",
    });

    regularUser = await User.create({
      username: "user",
      email: "user@example.com",
      password: "userpass",
      role: "USER",
    });
  });

  describe("Question Mutations", () => {
    it("should allow an admin to create a question", async () => {
      try {
        const res = await server.executeOperation(
          {
            query: CREATE_QUESTION,
            variables: {
              input: {
                prompt: "Consider the following geographical question:",
                questionText: "What is the capital of France?",
                answers: [
                  { text: "London", isCorrect: false, explanation: "Capital of UK" },
                  { text: "Berlin", isCorrect: false, explanation: "Capital of Germany" },
                  { text: "Paris", isCorrect: true, explanation: "Correct! Capital of France" },
                  { text: "Madrid", isCorrect: false, explanation: "Capital of Spain" }
                ],
                difficulty: "basic",
                type: "multiple_choice",
                topics: {
                  mainTopic: "Geography",
                  subTopics: ["European Capitals"]
                },
                sourceReferences: [{
                  page: 1,
                  lines: { start: 1, end: 5 },
                  text: "Paris is the capital of France"
                }],
                learningObjectives: ["Learn European capitals"],
                tags: ["geography", "europe", "capitals"],
                hint: "This city is known as the City of Light",
                points: 2,
                feedback: {
                  correct: "Great job! Paris is indeed the capital of France",
                  incorrect: "Try again! Think about the City of Light"
                }
              },
            },
          },
          createMockContext(adminUser)
        );

        expect(res.errors).toBeUndefined();
        expect(res.data?.createQuestion.prompt).toBe(
          "Consider the following geographical question:"
        );
        expect(res.data?.createQuestion.questionText).toBe(
          "What is the capital of France?"
        );
        expect(res.data?.createQuestion.answers).toHaveLength(4);
        expect(res.data?.createQuestion.answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("Paris");
        expect(res.data?.createQuestion.difficulty).toBe("basic");
        expect(res.data?.createQuestion.type).toBe("multiple_choice");
        expect(res.data?.createQuestion.topics.mainTopic).toBe("Geography");
        expect(res.data?.createQuestion.points).toBe(2);
        expect(res.data?.createQuestion.metadata.createdBy.username).toBe("admin");
      } catch (error) {
        console.error('Error in test:', error);
        throw error;
      }
    }, 30000);

    it("should allow an editor to create a question", async () => {
      const res = await server.executeOperation(
        {
          query: CREATE_QUESTION,
          variables: {
            input: {
              prompt: "Think about our solar system:",
              questionText: "What is the largest planet in our solar system?",
              answers: [
                { text: "Mars", isCorrect: false, explanation: "Much smaller than Jupiter" },
                { text: "Jupiter", isCorrect: true, explanation: "Correct! The largest planet" },
                { text: "Saturn", isCorrect: false, explanation: "Second largest" },
                { text: "Neptune", isCorrect: false, explanation: "An ice giant, but smaller" }
              ],
              difficulty: "basic",
              type: "multiple_choice",
              topics: {
                mainTopic: "Astronomy",
                subTopics: ["Solar System", "Planets"]
              },
              sourceReferences: [{
                page: 1,
                lines: { start: 1, end: 5 },
                text: "Jupiter is the largest planet"
              }],
              learningObjectives: ["Learn about planets"],
              tags: ["astronomy", "planets", "solar system"],
              hint: "This planet has a great red spot",
              points: 3,
              feedback: {
                correct: "Excellent! Jupiter is the largest planet",
                incorrect: "Not quite. Think about the gas giants"
              }
            },
          },
        },
        createMockContext(editorUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.createQuestion.prompt).toBe(
        "Think about our solar system:"
      );
      expect(res.data?.createQuestion.questionText).toBe(
        "What is the largest planet in our solar system?"
      );
      expect(res.data?.createQuestion.answers).toHaveLength(4);
      expect(res.data?.createQuestion.answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("Jupiter");
      expect(res.data?.createQuestion.points).toBe(3);
      expect(res.data?.createQuestion.metadata.createdBy.username).toBe("editor");
    });

    it("should not allow a regular user to create a question", async () => {
      const res = await server.executeOperation(
        {
          query: CREATE_QUESTION,
          variables: {
            input: {
              prompt: "Let's discuss literature:",
              questionText: "Who wrote Romeo and Juliet?",
              answers: [
                { text: "Charles Dickens", isCorrect: false, explanation: "Wrong era" },
                { text: "William Shakespeare", isCorrect: true, explanation: "Correct!" },
                { text: "Jane Austen", isCorrect: false, explanation: "Wrong era" },
                { text: "Mark Twain", isCorrect: false, explanation: "Wrong era" }
              ],
              difficulty: "basic",
              type: "multiple_choice",
              topics: {
                mainTopic: "Literature",
                subTopics: ["Shakespeare", "Plays"]
              },
              sourceReferences: [{
                page: 1,
                lines: { start: 1, end: 5 },
                text: "Shakespeare wrote Romeo and Juliet"
              }],
              learningObjectives: ["Learn about Shakespeare"],
              tags: ["literature", "shakespeare", "plays"],
              hint: "Think about the Elizabethan era",
              points: 1,
              feedback: {
                correct: "Correct! Shakespeare wrote this famous play",
                incorrect: "Try again! Think about the most famous playwright"
              }
            },
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeDefined();
      expect(res.errors?.[0].message).toContain("not have permission");
    });

    it("should allow an admin to update a question", async () => {
      const question = await Question.create({
        prompt: "Do some basic math:",
        questionText: "What is 2 + 2?",
        answers: [
          { text: "3", isCorrect: false, explanation: "Too low" },
          { text: "4", isCorrect: true, explanation: "Correct!" },
          { text: "5", isCorrect: false, explanation: "Too high" },
          { text: "6", isCorrect: false, explanation: "Too high" }
        ],
        difficulty: "basic",
        type: "multiple_choice",
        topics: {
          mainTopic: "Mathematics",
          subTopics: ["Addition"]
        },
        sourceReferences: [{
          page: 1,
          lines: { start: 1, end: 5 },
          text: "Basic addition"
        }],
        learningObjectives: ["Learn basic addition"],
        tags: ["math", "addition"],
        points: 1,
        feedback: {
          correct: "Great job!",
          incorrect: "Try again"
        },
        metadata: {
          createdBy: adminUser._id,
          lastModifiedBy: adminUser._id,
          version: 1,
          status: 'active'
        }
      });

      const res = await server.executeOperation(
        {
          query: UPDATE_QUESTION,
          variables: {
            id: question._id.toString(),
            input: {
              prompt: "Let's try a different math question:",
              questionText: "What is 2 + 3?",
              answers: [
                { text: "3", isCorrect: false, explanation: "Too low" },
                { text: "4", isCorrect: false, explanation: "Too low" },
                { text: "5", isCorrect: true, explanation: "Correct!" },
                { text: "6", isCorrect: false, explanation: "Too high" }
              ],
              difficulty: "basic",
              type: "multiple_choice",
              topics: {
                mainTopic: "Mathematics",
                subTopics: ["Addition"]
              },
              points: 2,
              feedback: {
                correct: "Excellent!",
                incorrect: "Keep trying"
              },
              tags: ["math"]
            },
          },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.updateQuestion.prompt).toBe(
        "Let's try a different math question:"
      );
      expect(res.data?.updateQuestion.questionText).toBe("What is 2 + 3?");
      expect(res.data?.updateQuestion.answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("5");
      expect(res.data?.updateQuestion.points).toBe(2);
    });

    it("should allow an admin to delete a question", async () => {
      const question = await Question.create({
        prompt: "Let's talk about world capitals:",
        questionText: "What is the capital of Japan?",
        answers: [
          { text: "Seoul", isCorrect: false, explanation: "Capital of South Korea" },
          { text: "Beijing", isCorrect: false, explanation: "Capital of China" },
          { text: "Tokyo", isCorrect: true, explanation: "Correct!" },
          { text: "Bangkok", isCorrect: false, explanation: "Capital of Thailand" }
        ],
        difficulty: "basic",
        type: "multiple_choice",
        topics: {
          mainTopic: "Geography",
          subTopics: ["Asian Capitals"]
        },
        sourceReferences: [{
          page: 1,
          lines: { start: 1, end: 5 },
          text: "Tokyo is the capital of Japan"
        }],
        learningObjectives: ["Learn Asian capitals"],
        tags: ["geography", "asia", "capitals"],
        points: 2,
        feedback: {
          correct: "Great job!",
          incorrect: "Try again"
        },
        metadata: {
          createdBy: adminUser._id,
          lastModifiedBy: adminUser._id,
          version: 1,
          status: 'active'
        }
      });

      const res = await server.executeOperation(
        {
          query: DELETE_QUESTION,
          variables: {
            id: question._id.toString(),
          },
        },
        createMockContext(adminUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.deleteQuestion).toBe(true);

      const deletedQuestion = await Question.findById(question._id);
      expect(deletedQuestion).toBeNull();
    });
  });

  describe("Question Queries", () => {
    it("should fetch all questions", async () => {
      await Question.create({
        prompt: "Consider this geography question:",
        questionText: "What is the capital of France?",
        answers: [
          { text: "London", isCorrect: false, explanation: "Capital of UK" },
          { text: "Berlin", isCorrect: false, explanation: "Capital of Germany" },
          { text: "Paris", isCorrect: true, explanation: "Correct!" },
          { text: "Madrid", isCorrect: false, explanation: "Capital of Spain" }
        ],
        difficulty: "basic",
        type: "multiple_choice",
        topics: {
          mainTopic: "Geography",
          subTopics: ["European Capitals"]
        },
        sourceReferences: [{
          page: 1,
          lines: { start: 1, end: 5 },
          text: "Paris is the capital of France"
        }],
        learningObjectives: ["Learn European capitals"],
        tags: ["geography", "europe", "capitals"],
        points: 2,
        feedback: {
          correct: "Great job!",
          incorrect: "Try again"
        },
        metadata: {
          createdBy: adminUser._id,
          lastModifiedBy: adminUser._id,
          version: 1,
          status: 'active'
        }
      });

      await Question.create({
        prompt: "Think about our solar system:",
        questionText: "What is the largest planet in our solar system?",
        answers: [
          { text: "Mars", isCorrect: false, explanation: "Too small" },
          { text: "Jupiter", isCorrect: true, explanation: "Correct!" },
          { text: "Saturn", isCorrect: false, explanation: "Second largest" },
          { text: "Neptune", isCorrect: false, explanation: "Too small" }
        ],
        difficulty: "basic",
        type: "multiple_choice",
        topics: {
          mainTopic: "Astronomy",
          subTopics: ["Planets"]
        },
        sourceReferences: [{
          page: 1,
          lines: { start: 1, end: 5 },
          text: "Jupiter is the largest planet"
        }],
        learningObjectives: ["Learn about planets"],
        tags: ["astronomy", "planets"],
        points: 3,
        feedback: {
          correct: "Excellent!",
          incorrect: "Try again"
        },
        metadata: {
          createdBy: editorUser._id,
          lastModifiedBy: editorUser._id,
          version: 1,
          status: 'active'
        }
      });

      const res = await server.executeOperation(
        {
          query: GET_QUESTIONS,
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.questions).toHaveLength(2);
      expect(res.data?.questions[0].prompt).toBe(
        "Consider this geography question:"
      );
      expect(res.data?.questions[0].questionText).toBe(
        "What is the capital of France?"
      );
      expect(res.data?.questions[0].answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("Paris");
      expect(res.data?.questions[0].points).toBe(2);
      expect(res.data?.questions[1].prompt).toBe(
        "Think about our solar system:"
      );
      expect(res.data?.questions[1].questionText).toBe(
        "What is the largest planet in our solar system?"
      );
      expect(res.data?.questions[1].answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("Jupiter");
      expect(res.data?.questions[1].points).toBe(3);
    });

    it("should fetch a specific question by ID", async () => {
      const question = await Question.create({
        prompt: "Let's talk about literature:",
        questionText: "Who wrote Romeo and Juliet?",
        answers: [
          { text: "Charles Dickens", isCorrect: false, explanation: "Wrong era" },
          { text: "William Shakespeare", isCorrect: true, explanation: "Correct!" },
          { text: "Jane Austen", isCorrect: false, explanation: "Wrong era" },
          { text: "Mark Twain", isCorrect: false, explanation: "Wrong era" }
        ],
        difficulty: "basic",
        type: "multiple_choice",
        topics: {
          mainTopic: "Literature",
          subTopics: ["Shakespeare"]
        },
        sourceReferences: [{
          page: 1,
          lines: { start: 1, end: 5 },
          text: "Shakespeare wrote Romeo and Juliet"
        }],
        learningObjectives: ["Learn about Shakespeare"],
        tags: ["literature", "shakespeare"],
        points: 2,
        feedback: {
          correct: "Great job!",
          incorrect: "Try again"
        },
        metadata: {
          createdBy: editorUser._id,
          lastModifiedBy: editorUser._id,
          version: 1,
          status: 'active'
        }
      });

      const res = await server.executeOperation(
        {
          query: GET_QUESTION,
          variables: {
            id: question._id.toString(),
          },
        },
        createMockContext(regularUser)
      );

      expect(res.errors).toBeUndefined();
      expect(res.data?.question.prompt).toBe("Let's talk about literature:");
      expect(res.data?.question.questionText).toBe(
        "Who wrote Romeo and Juliet?"
      );
      expect(res.data?.question.answers.find((a: { isCorrect: boolean }) => a.isCorrect)?.text).toBe("William Shakespeare");
      expect(res.data?.question.points).toBe(2);
      expect(res.data?.question.metadata.createdBy.username).toBe("editor");
    });
  });
});
