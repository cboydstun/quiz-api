// src/utils/errors.ts

class CustomError extends Error {
    code: string;
    status: number;
  
    constructor(message: string, code: string, status: number) {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
      this.status = status;
    }
  }
  
  export class AuthenticationError extends CustomError {
    constructor(message: string) {
      super(message, 'UNAUTHENTICATED', 401);
    }
  }
  
  export class ForbiddenError extends CustomError {
    constructor(message: string) {
      super(message, 'FORBIDDEN', 403);
    }
  }
  
  export class UserInputError extends CustomError {
    constructor(message: string) {
      super(message, 'BAD_USER_INPUT', 400);
    }
  }
  
  export class NotFoundError extends CustomError {
    constructor(message: string) {
      super(message, 'NOT_FOUND', 404);
    }
  }
  
  // Error handling middleware
  export const errorHandler = (error: any) => {
    console.error('Error:', error);
  
    if (error instanceof CustomError) {
      return {
        message: error.message,
        code: error.code,
        status: error.status,
      };
    }
  
    // For unexpected errors, don't expose internal details
    return {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    };
  };