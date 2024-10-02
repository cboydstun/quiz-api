import { ApolloServer } from 'apollo-server-express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import User from '../../../models/User';
import typeDefs from '../../../schema';
import resolvers from '../../../resolvers';
import { generateToken } from '../../../utils/auth';
import { Request, Response } from 'express';

let mongoServer: MongoMemoryServer;
let server: ApolloServer;
let userId: string;
let token: string;
const initialPassword = 'testpassword123';

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    server = new ApolloServer({
        schema,
        context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    });

    // Create a test user
    const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: initialPassword,
    });

    await user.save();

    userId = user._id.toString();
    token = generateToken(user);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

const UPDATE_USERNAME = `
  mutation UpdateUsername($username: String!) {
    updateUsername(username: $username) {
      id
      username
    }
  }
`;

const UPDATE_PASSWORD = `
  mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
    updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

describe('User Mutations', () => {
    it('should update username', async () => {
        const newUsername = 'newusername';

        const res = await server.executeOperation({
            query: UPDATE_USERNAME,
            variables: { username: newUsername },
        }, {
            req: {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            } as Request,
            res: {} as Response,
        });

        expect(res.data?.updateUsername.username).toBe(newUsername);
        expect(res.data?.updateUsername.id).toBe(userId);

        // Verify the username was updated in the database
        const updatedUser = await User.findById(userId);
        expect(updatedUser?.username).toBe(newUsername);
    });

    it('should not update username if it already exists', async () => {
        const existingUsername = 'existinguser';

        // Create another user with the username we'll try to update to
        await User.create({
            username: existingUsername,
            email: 'existing@example.com',
            password: 'password123',
        });

        const res = await server.executeOperation({
            query: UPDATE_USERNAME,
            variables: { username: existingUsername },
        }, {
            req: {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            } as Request,
            res: {} as Response,
        });

        expect(res.errors?.[0].message).toBe('Username is already taken');
    });

    it('should authenticate with initial password', async () => {
        const user = await User.findById(userId);
        if (user) {
            const isMatch = await user.comparePassword(initialPassword);
            expect(isMatch).toBe(true);
        } else {
            fail('User not found');
        }
    });

    it('should update password', async () => {
        const currentPassword = initialPassword;
        const newPassword = 'newpassword123';

        const res = await server.executeOperation({
            query: UPDATE_PASSWORD,
            variables: { currentPassword, newPassword },
        }, {
            req: {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            } as Request,
            res: {} as Response,
        });

        expect(res.data?.updatePassword.success).toBe(true);
        expect(res.data?.updatePassword.message).toBe('Password updated successfully');

        // Verify the password was updated in the database
        const updatedUser = await User.findById(userId);
        if (updatedUser) {
            const isMatch = await updatedUser.comparePassword(newPassword);
            expect(isMatch).toBe(true);
        } else {
            fail('User not found');
        }
    });

    it('should not update password if current password is incorrect', async () => {
        const incorrectCurrentPassword = 'wrongpassword';
        const newPassword = 'newpassword123';

        const res = await server.executeOperation({
            query: UPDATE_PASSWORD,
            variables: { currentPassword: incorrectCurrentPassword, newPassword },
        }, {
            req: {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            } as Request,
            res: {} as Response,
        });

        expect(res.errors?.[0].message).toBe('Current password is incorrect');
    });
});