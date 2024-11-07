// src/__tests__/resolvers/query/questions.test.ts

import resolvers from "../../../resolvers";
import Question from "../../../models/Question";
import { Types } from "mongoose";

jest.mock("../../../models/Question");

type QuestionDifficulty = 'basic' | 'intermediate' | 'advanced';
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_in_blank';

interface MockUser {
  _id: string;
  role: string;
  username: string;
}

describe("Query resolvers - questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all questions", async () => {
    const mockUser: MockUser = {
      _id: "123",
      role: "EDITOR",
      username: "editor"
    };

    const mockQuestions = [
      {
        _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
        prompt: "Test prompt 1",
        questionText: "Question 1",
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
        hint: "Hint 1",
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
          timesAnswered: 10,
          correctAnswers: 8,
          averageTimeToAnswer: 45,
          difficultyRating: 3
        }
      },
      {
        _id: new Types.ObjectId("603f1f77bcf86cd799439210"),
        prompt: "Test prompt 2",
        questionText: "Question 2",
        answers: [
          { text: "X", isCorrect: true, explanation: "This is correct" },
          { text: "Y", isCorrect: false, explanation: "This is incorrect" }
        ],
        difficulty: "intermediate" as QuestionDifficulty,
        type: "multiple_choice" as QuestionType,
        topics: {
          mainTopic: "Programming",
          subTopics: ["TypeScript"]
        },
        sourceReferences: [{
          page: 2,
          lines: { start: 10, end: 15 },
          text: "Reference text"
        }],
        learningObjectives: ["Learn TypeScript"],
        tags: ["programming", "typescript"],
        hint: "Hint 2",
        points: 2,
        feedback: {
          correct: "Excellent!",
          incorrect: "Keep trying!"
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
          timesAnswered: 5,
          correctAnswers: 3,
          averageTimeToAnswer: 60,
          difficultyRating: 4
        }
      }
    ];

    (Question.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockQuestions)
          })
        })
      })
    });

    const result = await resolvers.Query.questions(null, {}, { req: {} } as any);

    expect(result).toEqual(mockQuestions);
  });

  it("should filter questions by difficulty", async () => {
    const mockUser: MockUser = {
      _id: "123",
      role: "EDITOR",
      username: "editor"
    };

    const mockQuestions = [
      {
        _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
        prompt: "Test prompt 1",
        questionText: "Question 1",
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
        hint: "Hint 1",
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
          timesAnswered: 10,
          correctAnswers: 8,
          averageTimeToAnswer: 45,
          difficultyRating: 3
        }
      }
    ];

    (Question.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockQuestions)
          })
        })
      })
    });

    const result = await resolvers.Query.questions(null, { difficulty: "basic" }, { req: {} } as any);

    expect(result).toEqual(mockQuestions);
    expect(Question.find).toHaveBeenCalledWith({ difficulty: "basic" });
  });

  it("should filter questions by type", async () => {
    const mockUser: MockUser = {
      _id: "123",
      role: "EDITOR",
      username: "editor"
    };

    const mockQuestions = [
      {
        _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
        prompt: "Test prompt 1",
        questionText: "Question 1",
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
        hint: "Hint 1",
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
          timesAnswered: 10,
          correctAnswers: 8,
          averageTimeToAnswer: 45,
          difficultyRating: 3
        }
      }
    ];

    (Question.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockQuestions)
          })
        })
      })
    });

    const result = await resolvers.Query.questions(null, { type: "multiple_choice" }, { req: {} } as any);

    expect(result).toEqual(mockQuestions);
    expect(Question.find).toHaveBeenCalledWith({ type: "multiple_choice" });
  });
});
