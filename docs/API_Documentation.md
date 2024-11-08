# API Documentation

This document provides detailed information about all queries and mutations available in the Quiz API. It serves as a comprehensive guide for developers working with or integrating the Quiz API into their applications.

## GraphQL Endpoint

The GraphQL API is available at: `http://localhost:4000/v1/graphql` (or the port specified in your .env file)

## Running the Application

1. For development:

   ```
   npm run dev
   ```

2. For production using PM2:

   ```
   npm run build
   pm2 start ecosystem.config.js
   ```

3. For production without PM2:
   ```
   npm run build
   npm start
   ```

## Project Structure

```
quiz-api/
├── src/
│   ├── config/         # Configuration files
│   ├── models/         # Mongoose models
│   ├── resolvers/      # GraphQL resolvers
│   ├── schema/         # GraphQL schema definitions
│   ├── utils/          # Utility functions
│   ├── __tests__/      # Test files
│   ├── seedQuestions.json  # Seed data for questions
│   ├── seedQuestions.ts    # Script to seed questions
│   ├── seedUsers.json      # Seed data for users
│   ├── seedUsers.ts        # Script to seed users
│   └── index.ts        # Application entry point
├── ecosystem.config.js # PM2 configuration
└── README.md           # Project documentation
```

## Index

- [Authentication](./Authentication.md)
- [User](./User.md)
- [Questions](./Questions.md)
- [Leaderboard](./Leaderboard.md)
- [Input Types](./InputTypes.md)

## Question System Features

The Quiz API includes a sophisticated question management system with the following features:

1. Question Types and Difficulty Levels

   - Multiple choice, true-false, and fill-in-blank questions
   - Three difficulty levels: basic, intermediate, and advanced
   - Points system based on difficulty and complexity

2. Source Reference Tracking

   - Precise mapping to source material (page numbers, chapters, sections)
   - Line number tracking for specific content
   - Text excerpts for reference

3. Topic Organization

   - Hierarchical topic structure with main topics and subtopics
   - Efficient querying by topic or subtopic
   - Related questions linking

4. Question Lifecycle Management

   - Version control for questions
   - Status tracking (draft, review, active, archived)
   - Creation and modification metadata
   - Audit trail of changes

5. Learning Objectives and Feedback

   - Explicit learning objectives for each question
   - Detailed feedback for correct and incorrect answers
   - Answer explanations for enhanced learning

6. Performance Analytics
   - Usage statistics tracking
   - Answer success rates
   - Time-to-answer metrics
   - Dynamic difficulty rating

## Error Handling

The API uses standard GraphQL error handling mechanisms. Errors are returned in the "errors" array of the GraphQL response. Each error object typically contains:

- message: A human-readable error message
- locations: An array of objects with line and column numbers indicating where the error occurred in the query
- path: An array representing the path of the field in the query that caused the error
- extensions: Additional information about the error, which may include a code representing the error type

Common error codes you might encounter:

1. Authentication and Authorization

   - UNAUTHENTICATED: The user is not authenticated (not logged in)
   - FORBIDDEN: The user does not have permission to perform the requested action
   - INVALID_TOKEN: The provided authentication token is invalid or expired

2. Input Validation

   - BAD_USER_INPUT: The input provided by the user is invalid
   - INVALID_QUESTION_TYPE: The question type is not one of the allowed values
   - INVALID_DIFFICULTY: The difficulty level is not one of the allowed values
   - INVALID_STATUS: The question status is not one of the allowed values

3. Resource Errors

   - NOT_FOUND: The requested resource was not found
   - DUPLICATE_ENTRY: Attempt to create a duplicate resource
   - VERSION_CONFLICT: Attempt to update a resource with an outdated version

4. System Errors
   - INTERNAL_SERVER_ERROR: An unexpected error occurred on the server
   - DATABASE_ERROR: Error communicating with the database
   - RATE_LIMIT_EXCEEDED: Too many requests in a given time period

## Notes

- All mutations and queries that require authentication should include the JWT token in the Authorization header as a Bearer token.
- Admin-only operations require the user to have the ADMIN or SUPER_ADMIN role.
- Editor operations (like creating or updating questions) require the user to have the EDITOR, ADMIN, or SUPER_ADMIN role.
- The API implements rate limiting to prevent abuse. Excessive requests may be temporarily blocked.
- Email addresses in the leaderboard query results are masked for privacy.
- Questions go through a lifecycle: draft → review → active → archived
- Question versions are automatically incremented on updates
- Source references are validated against known source materials
- Topic hierarchies must match predefined structures
- Learning objectives should be specific and measurable
- Performance metrics are automatically updated based on user interactions
- The API supports bulk operations for questions but with rate limiting
- GitHub Actions CI/CD Pipeline enabled.
