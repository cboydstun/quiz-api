// src/utils/errors.ts

export class CustomError extends Error {
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
    super(message, "UNAUTHENTICATED", 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string) {
    super(message, "FORBIDDEN", 403);
  }
}

export class UserInputError extends CustomError {
  constructor(message: string) {
    super(message, "BAD_USER_INPUT", 400);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, "NOT_FOUND", 404);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

// Error handling function
export const handleCustomError = (error: CustomError) => {
  console.error("Error:", error);

  return {
    message: error.message,
    code: error.code,
    status: error.status,
  };
};

// For unexpected errors, don't expose internal details
export const handleUnexpectedError = () => {
  return {
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    status: 500,
  };
};
