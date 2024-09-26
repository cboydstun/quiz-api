// src/__tests__/resolvers/leaderboardResolvers.test.ts

import { ApolloError } from 'apollo-server-express';
import { Types } from 'mongoose';
import leaderboardResolvers from '../../resolvers/leaderboardResolvers';
import User from '../../models/User';
import * as authUtils from '../../utils/auth';
import { logger } from '../../utils/logger';

// Mock the User model, auth utilities, and logger
jest.mock('../../models/User');
jest.mock('../../utils/auth');
jest.mock('../../utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Leaderboard Resolvers', () => {
    const mockContext = { req: {} };
    const mockUser = {
      _id: new Types.ObjectId(),
      username: 'testuser',
      email: 'test@example.com',
      role: 'USER',
      score: 100,
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
      (authUtils.checkAuth as jest.Mock).mockResolvedValue(mockUser);
    });
  
    it('should return leaderboard and current user entry', async () => {
      const mockUsers = [
        { ...mockUser, _id: new Types.ObjectId(), score: 200, username: 'user1' },
        { ...mockUser, _id: new Types.ObjectId(), score: 150, username: 'user2' },
        mockUser,
        { ...mockUser, _id: new Types.ObjectId(), score: 50, username: 'user4' },
      ];
  
      (User.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });
  
      const result = await leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext);
  
      expect(result.leaderboard).toHaveLength(4);
      expect(result.leaderboard[0].position).toBe(1);
      expect(result.leaderboard[0].user.username).toBe('user1');
      expect(result.leaderboard[0].score).toBe(200);
      expect(result.currentUserEntry).toBeDefined();
      expect(result.currentUserEntry?.position).toBe(3);  // Changed from 3 to 3
      expect(result.currentUserEntry?.user.username).toBe('testuser');
      expect(result.currentUserEntry?.score).toBe(100);
    });

    it('should handle case when current user has no score', async () => {
        const userWithNoScore = { ...mockUser, score: null };
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(userWithNoScore);
    
        const mockUsers = [
          { ...mockUser, _id: new Types.ObjectId(), score: 200, username: 'user1' },
          { ...mockUser, _id: new Types.ObjectId(), score: 150, username: 'user2' },
        ];
    
        (User.find as jest.Mock).mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(mockUsers),
        });
    
        const result = await leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext);
    
        expect(result.leaderboard).toHaveLength(2);
        expect(result.currentUserEntry).toBeNull();
      });

    it('should throw ApolloError when User.find fails', async () => {
        (User.find as jest.Mock).mockImplementation(() => {
            throw new Error('Database error');
        });

        await expect(leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext))
            .rejects
            .toThrow(ApolloError);
        expect(logger.error).toHaveBeenCalledWith("Error in getLeaderboard resolver", expect.any(Object));
    });

    it('should handle unauthenticated user', async () => {
        (authUtils.checkAuth as jest.Mock).mockResolvedValue(null);

        const result = await leaderboardResolvers.Query.getLeaderboard(null, { limit: 10 }, mockContext);

        expect(result.leaderboard).toHaveLength(0);
        expect(result.currentUserEntry).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith("User not authenticated in getLeaderboard");
    });
});