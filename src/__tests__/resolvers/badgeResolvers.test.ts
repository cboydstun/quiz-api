import { AuthenticationError, UserInputError } from 'apollo-server-express';
import Badge from '../../models/Badge';
import User from '../../models/User';
import badgeResolvers from '../../resolvers/badgeResolvers';
import { checkAuth } from '../../utils/auth';

// Mock the models and auth utility
jest.mock('../../models/Badge');
jest.mock('../../models/User');
jest.mock('../../utils/auth');

describe('Badge Resolvers', () => {
    const mockContext = {
        req: {},
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Query', () => {
        describe('badges', () => {
            it('should return all badges for authenticated users', async () => {
                const mockBadges = [{ id: '1', name: 'Test Badge' }];
                (Badge.find as jest.Mock).mockResolvedValue(mockBadges);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'user1' });

                const result = await (badgeResolvers.Query as any).badges(null, {}, mockContext);

                expect(checkAuth).toHaveBeenCalledWith(mockContext.req);
                expect(Badge.find).toHaveBeenCalled();
                expect(result).toEqual(mockBadges);
            });

            it('should throw AuthenticationError for unauthenticated users', async () => {
                (checkAuth as jest.Mock).mockImplementation(() => {
                    throw new AuthenticationError('Not authenticated');
                });

                await expect((badgeResolvers.Query as any).badges(null, {}, mockContext)).rejects.toThrow(AuthenticationError);
            });
        });

        describe('badge', () => {
            it('should return a specific badge for authenticated users', async () => {
                const mockBadge = { id: '1', name: 'Test Badge' };
                (Badge.findById as jest.Mock).mockResolvedValue(mockBadge);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'user1' });

                const result = await (badgeResolvers.Query as any).badge(null, { id: '1' }, mockContext);

                expect(checkAuth).toHaveBeenCalledWith(mockContext.req);
                expect(Badge.findById).toHaveBeenCalledWith('1');
                expect(result).toEqual(mockBadge);
            });

            it('should throw UserInputError if badge is not found', async () => {
                (Badge.findById as jest.Mock).mockResolvedValue(null);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'user1' });

                await expect((badgeResolvers.Query as any).badge(null, { id: '1' }, mockContext)).rejects.toThrow(UserInputError);
            });
        });
    });

    describe('Mutation', () => {
        describe('createBadge', () => {
            it('should create a new badge for admin users', async () => {
                const mockBadge = { id: '1', name: 'New Badge', description: 'Test description', imageUrl: 'test.jpg' };
                (Badge.prototype.save as jest.Mock).mockResolvedValue(mockBadge);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'admin1', role: 'ADMIN' });

                const result = await (badgeResolvers.Mutation as any).createBadge(
                    null,
                    { name: 'New Badge', description: 'Test description', imageUrl: 'test.jpg' },
                    mockContext
                );

                expect(checkAuth).toHaveBeenCalledWith(mockContext.req);
                expect(Badge.prototype.save).toHaveBeenCalled();
                expect(result).toEqual(mockBadge);
            });

            it('should throw AuthenticationError for non-admin users', async () => {
                (checkAuth as jest.Mock).mockReturnValue({ id: 'user1', role: 'USER' });

                await expect(
                    (badgeResolvers.Mutation as any).createBadge(
                        null,
                        { name: 'New Badge', description: 'Test description', imageUrl: 'test.jpg' },
                        mockContext
                    )
                ).rejects.toThrow(AuthenticationError);
            });
        });

        describe('issueBadgeToUser', () => {
            it('should issue a badge to a user for admin users', async () => {
                const mockBadge = { id: 'badge1', name: 'Test Badge' };
                const mockUser = {
                    id: 'user1',
                    badges: [],
                    save: jest.fn().mockResolvedValue({ id: 'user1', badges: ['badge1'] })
                };
                (Badge.findById as jest.Mock).mockResolvedValue(mockBadge);
                (User.findById as jest.Mock).mockResolvedValue(mockUser);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'admin1', role: 'ADMIN' });

                const result = await (badgeResolvers.Mutation as any).issueBadgeToUser(
                    null,
                    { badgeId: 'badge1', userId: 'user1' },
                    mockContext
                );

                expect(checkAuth).toHaveBeenCalledWith(mockContext.req);
                expect(Badge.findById).toHaveBeenCalledWith('badge1');
                expect(User.findById).toHaveBeenCalledWith('user1');
                expect(mockUser.save).toHaveBeenCalled();
                expect(result.badges).toContain('badge1');
            });

            it('should throw AuthenticationError for non-admin users', async () => {
                (checkAuth as jest.Mock).mockReturnValue({ id: 'user1', role: 'USER' });

                await expect(
                    (badgeResolvers.Mutation as any).issueBadgeToUser(null, { badgeId: 'badge1', userId: 'user1' }, mockContext)
                ).rejects.toThrow(AuthenticationError);
            });

            it('should throw UserInputError if badge is not found', async () => {
                (Badge.findById as jest.Mock).mockResolvedValue(null);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'admin1', role: 'ADMIN' });

                await expect(
                    (badgeResolvers.Mutation as any).issueBadgeToUser(null, { badgeId: 'badge1', userId: 'user1' }, mockContext)
                ).rejects.toThrow(UserInputError);
            });

            it('should throw UserInputError if user is not found', async () => {
                (Badge.findById as jest.Mock).mockResolvedValue({ id: 'badge1', name: 'Test Badge' });
                (User.findById as jest.Mock).mockResolvedValue(null);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'admin1', role: 'ADMIN' });

                await expect(
                    (badgeResolvers.Mutation as any).issueBadgeToUser(null, { badgeId: 'badge1', userId: 'user1' }, mockContext)
                ).rejects.toThrow(UserInputError);
            });

            it('should throw UserInputError if user already has the badge', async () => {
                const mockBadge = { id: 'badge1', name: 'Test Badge' };
                const mockUser = {
                    id: 'user1',
                    badges: ['badge1'],
                    save: jest.fn()
                };
                (Badge.findById as jest.Mock).mockResolvedValue(mockBadge);
                (User.findById as jest.Mock).mockResolvedValue(mockUser);
                (checkAuth as jest.Mock).mockReturnValue({ id: 'admin1', role: 'ADMIN' });

                await expect(
                    (badgeResolvers.Mutation as any).issueBadgeToUser(null, { badgeId: 'badge1', userId: 'user1' }, mockContext)
                ).rejects.toThrow(UserInputError);
            });
        });
    });
});
