// src/__tests__/resolvers/query/getGoogleAuthUrl.test.ts

import resolvers from "../../../resolvers";
import { ApolloError } from "apollo-server-express";
import * as googleAuth from "../../../resolvers/authResolvers";

jest.mock("google-auth-library"); // Mock the external library instead

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = "mock-client-id";
process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/login";

describe("Query resolvers - getGoogleAuthUrl", () => {
  let mockGenerateAuthUrl: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateAuthUrl = jest.fn();
    mockClient = { generateAuthUrl: mockGenerateAuthUrl };

    // Mock the createOAuth2Client function
    jest.spyOn(googleAuth, "createOAuth2Client").mockReturnValue(mockClient);

    // Set the client in the resolver to the mocked client
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
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: "offline",
        scope: ["profile", "email"],
        redirect_uri: expect.any(String),
      })
    );
  });

  it("should throw ApolloError when generateAuthUrl fails", async () => {
    mockGenerateAuthUrl.mockRejectedValue(new Error("Failed to generate URL"));

    await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow(
      ApolloError
    );
    await expect(resolvers.Query.getGoogleAuthUrl()).rejects.toThrow(
      "Failed to generate Google Auth URL"
    );
  });
});
