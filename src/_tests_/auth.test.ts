// src/__tests__/auth.test.ts

import { checkAuth, generateToken } from '../utils/auth';
import { checkPermission } from '../utils/permissions';
import { AuthenticationError, ForbiddenError } from '../utils/errors';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('Authentication and Authorization', () => {
  describe('checkAuth', () => {
    it('should return user data if a valid token is provided', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'USER' };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);

      const context = { req: { headers: { authorization: 'Bearer validtoken' } } };
      const result = await checkAuth(context);

      expect(result).toEqual(mockUser);
      expect(jwt.verify).toHaveBeenCalledWith('validtoken', process.env.JWT_SECRET);
    });

    it('should throw AuthenticationError if no authorization header is provided', async () => {
      const context = { req: { headers: {} } };
      await expect(checkAuth(context)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError if the token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const context = { req: { headers: { authorization: 'Bearer invalidtoken' } } };
      await expect(checkAuth(context)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('checkPermission', () => {
    it('should not throw an error if user has required permission', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'ADMIN' };
      const mockContext = { user: mockUser };

      await expect(checkPermission(mockContext, ['ADMIN', 'SUPER_ADMIN'])).resolves.not.toThrow();
    });

    it('should throw ForbiddenError if user does not have required permission', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'USER' };
      const mockContext = { user: mockUser };

      await expect(checkPermission(mockContext, ['ADMIN', 'SUPER_ADMIN'])).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if user object is not in context', async () => {
      const mockContext = {};

      await expect(checkPermission(mockContext, ['ADMIN', 'SUPER_ADMIN'])).rejects.toThrow(ForbiddenError);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'USER' };
      (jwt.sign as jest.Mock).mockReturnValue('generatedtoken');

      const token = generateToken(mockUser);

      expect(token).toBe('generatedtoken');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
    });
  });
});