import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import typeDefs from '../schema';
import { resolvers } from '../resolvers';
import { generateToken, DecodedUser } from './auth';

const schema = makeExecutableSchema({
    typeDefs,
    resolvers: resolvers as any // Type assertion to bypass strict type checking
});

// Create a mock user for testing
const mockUser: DecodedUser = {
    _id: '123456789',
    email: 'test@example.com',
    role: 'ADMIN',
    username: 'testuser',
    score: 100
};

// Generate a token for the mock user
const mockToken = generateToken(mockUser);

export const constructTestServer = async () => {
    const app = express();
    const httpServer = createServer(app);

    const server = new ApolloServer({
        schema,
        context: ({ req }) => ({ req }),
    });

    await server.start();
    server.applyMiddleware({ app });

    await new Promise<void>((resolve) => httpServer.listen({ port: 0 }, resolve));
    const { port } = httpServer.address() as AddressInfo;

    const url = `http://localhost:${port}${server.graphqlPath}`;

    console.log(`Test server running at ${url}`);

    const stop = async () => {
        await server.stop();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
        console.log('Test server stopped');
    };

    return {
        server,
        url,
        stop,
        executeOperation: async (args: any) => {
            try {
                // Create a mock req object that satisfies the Request interface
                const mockReq = {
                    headers: {
                        authorization: `Bearer ${mockToken}` // Include the mock token
                    },
                    body: {},
                    cookies: {},
                    query: {},
                    params: {},
                    get: () => { },
                    header: () => { },
                    accepts: () => { },
                    acceptsCharsets: () => { },
                    acceptsEncodings: () => { },
                    acceptsLanguages: () => { },
                    // Add any other properties that your resolvers might expect
                } as unknown as Request;

                // Create a mock res object that satisfies the Response interface
                const mockRes = {
                    status: () => ({ json: () => { } }),
                    json: () => { },
                    send: () => { },
                    // Add any other properties that your resolvers might expect
                } as unknown as Response;

                const response = await server.executeOperation(args, {
                    req: mockReq,
                    res: mockRes,
                });
                if (response.errors) {
                    console.error('GraphQL operation errors:', response.errors);
                }
                return response;
            } catch (error) {
                console.error('Error executing GraphQL operation:', error);
                throw error;
            }
        },
    };
};

export interface TestServer {
    server: ApolloServer;
    url: string;
    stop: () => Promise<void>;
    executeOperation: (args: any) => Promise<any>;
}
