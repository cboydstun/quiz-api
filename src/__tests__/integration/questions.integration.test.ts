import { ApolloServer } from 'apollo-server-express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer';
import typeDefs from '../../schema';
import resolvers from '../../resolvers';
import User from '../../models/User';
import Question from '../../models/Question';
import { generateToken } from '../../utils/auth';

let mongoServer: MongoMemoryServer;

const CREATE_QUESTION = `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      questionText
      answers
      correctAnswer
      createdBy {
        id
        username
      }
    }
  }
`;

const GET_QUESTIONS = `
  query GetQuestions {
    questions {
      id
      questionText
      answers
      correctAnswer
      createdBy {
        id
        username
      }
    }
  }
`;

const GET_QUESTION = `
  query GetQuestion($id: ID!) {
    question(id: $id) {
      id
      questionText
      answers
      correctAnswer
      createdBy {
        id
        username
      }
    }
  }
`;

const UPDATE_QUESTION = `
  mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
    updateQuestion(id: $id, input: $input) {
      id
      questionText
      answers
      correctAnswer
      createdBy {
        id
        username
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
                authorization: `Bearer ${token}`
            },
            get: (name: string) => name === 'authorization' ? `Bearer ${token}` : '',
            header: (name: string) => name === 'authorization' ? `Bearer ${token}` : '',
            user
        } as unknown as Request,
        res: {} as Response
    };
};

describe('Question Operations Integration Tests', () => {
    let server: ApolloServer<ExpressContext>;
    let adminUser: any;
    let editorUser: any;
    let regularUser: any;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        process.env.JWT_SECRET = 'test-secret';

        server = new ApolloServer<ExpressContext>({
            typeDefs,
            resolvers,
            context: ({ req, res }) => ({ req, res })
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

        adminUser = await User.create({
            username: 'admin',
            email: 'admin@example.com',
            password: 'adminpass',
            role: 'ADMIN'
        });

        editorUser = await User.create({
            username: 'editor',
            email: 'editor@example.com',
            password: 'editorpass',
            role: 'EDITOR'
        });

        regularUser = await User.create({
            username: 'user',
            email: 'user@example.com',
            password: 'userpass',
            role: 'USER'
        });
    });

    describe('Question Mutations', () => {
        it('should allow an admin to create a question', async () => {
            const res = await server.executeOperation({
                query: CREATE_QUESTION,
                variables: {
                    input: {
                        questionText: "What is the capital of France?",
                        answers: ["London", "Berlin", "Paris", "Madrid"],
                        correctAnswer: "Paris"
                    }
                }
            }, createMockContext(adminUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.createQuestion.questionText).toBe("What is the capital of France?");
            expect(res.data?.createQuestion.createdBy.username).toBe("admin");
        });

        it('should allow an editor to create a question', async () => {
            const res = await server.executeOperation({
                query: CREATE_QUESTION,
                variables: {
                    input: {
                        questionText: "What is the largest planet in our solar system?",
                        answers: ["Mars", "Jupiter", "Saturn", "Neptune"],
                        correctAnswer: "Jupiter"
                    }
                }
            }, createMockContext(editorUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.createQuestion.questionText).toBe("What is the largest planet in our solar system?");
            expect(res.data?.createQuestion.createdBy.username).toBe("editor");
        });

        it('should not allow a regular user to create a question', async () => {
            const res = await server.executeOperation({
                query: CREATE_QUESTION,
                variables: {
                    input: {
                        questionText: "Who wrote Romeo and Juliet?",
                        answers: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                        correctAnswer: "William Shakespeare"
                    }
                }
            }, createMockContext(regularUser));

            expect(res.errors).toBeDefined();
            expect(res.errors?.[0].message).toContain('not have permission');
        });

        it('should allow an admin to update a question', async () => {
            const question = await Question.create({
                questionText: "What is 2 + 2?",
                answers: ["3", "4", "5", "6"],
                correctAnswer: "4",
                createdBy: adminUser._id
            });

            const res = await server.executeOperation({
                query: UPDATE_QUESTION,
                variables: {
                    id: question._id.toString(),
                    input: {
                        questionText: "What is 2 + 3?",
                        answers: ["3", "4", "5", "6"],
                        correctAnswer: "5"
                    }
                }
            }, createMockContext(adminUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.updateQuestion.questionText).toBe("What is 2 + 3?");
            expect(res.data?.updateQuestion.correctAnswer).toBe("5");
        });

        it('should allow an admin to delete a question', async () => {
            const question = await Question.create({
                questionText: "What is the capital of Japan?",
                answers: ["Seoul", "Beijing", "Tokyo", "Bangkok"],
                correctAnswer: "Tokyo",
                createdBy: adminUser._id
            });

            const res = await server.executeOperation({
                query: DELETE_QUESTION,
                variables: {
                    id: question._id.toString()
                }
            }, createMockContext(adminUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.deleteQuestion).toBe(true);

            const deletedQuestion = await Question.findById(question._id);
            expect(deletedQuestion).toBeNull();
        });
    });

    describe('Question Queries', () => {
        it('should fetch all questions', async () => {
            await Question.create({
                questionText: "What is the capital of France?",
                answers: ["London", "Berlin", "Paris", "Madrid"],
                correctAnswer: "Paris",
                createdBy: adminUser._id
            });

            await Question.create({
                questionText: "What is the largest planet in our solar system?",
                answers: ["Mars", "Jupiter", "Saturn", "Neptune"],
                correctAnswer: "Jupiter",
                createdBy: editorUser._id
            });

            const res = await server.executeOperation({
                query: GET_QUESTIONS
            }, createMockContext(regularUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.questions).toHaveLength(2);
            expect(res.data?.questions[0].questionText).toBe("What is the capital of France?");
            expect(res.data?.questions[1].questionText).toBe("What is the largest planet in our solar system?");
        });

        it('should fetch a specific question by ID', async () => {
            const question = await Question.create({
                questionText: "Who wrote Romeo and Juliet?",
                answers: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                correctAnswer: "William Shakespeare",
                createdBy: editorUser._id
            });

            const res = await server.executeOperation({
                query: GET_QUESTION,
                variables: {
                    id: question._id.toString()
                }
            }, createMockContext(regularUser));

            expect(res.errors).toBeUndefined();
            expect(res.data?.question.questionText).toBe("Who wrote Romeo and Juliet?");
            expect(res.data?.question.createdBy.username).toBe("editor");
        });
    });
});