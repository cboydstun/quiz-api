# Quiz API

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Usage Examples](#api-usage-examples)
- [Project Structure](#project-structure)
- [Error Handling and Logging](#error-handling-and-logging)
- [Security](#security)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

Quiz API is a GraphQL-based backend service for managing quizzes, questions, and user interactions. It provides functionality for user authentication, question management, user statistics tracking, and leaderboard functionality.

## Features

- User authentication (local and Google OAuth)
- CRUD operations for quiz questions
- User response tracking
- Skill-based user progression (WORK IN PROGRESS)
- Daily, monthly, yearly, and lifetime point tracking
- Consecutive login tracking
- Leaderboard functionality
- Role-based access control
- Rate limiting
- Error logging

## Technologies Used

- Node.js
- Express.js
- GraphQL (Apollo Server)
- MongoDB (Mongoose ORM)
- TypeScript
- Jest (for testing)
- Passport.js (for authentication)
- Winston (for logging)
- PM2 (for process management)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v18 or later)
- MongoDB
- npm or pnpm

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/quiz-api.git
   cd quiz-api
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or if you're using pnpm:
   ```
   pnpm install
   ```

## Configuration

1. Create a `.env` file in the root directory with the following variables:

   ```
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/quiz-api
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
   ```

   Replace the values with your actual configuration.

2. Adjust any other configuration in `src/config/` directory if needed.

3. Review and update the `ecosystem.config.js` file for PM2 deployment settings if necessary.

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

The API will be available at `http://localhost:4000/graphql` (or the port you specified in the .env file).

## API Usage Examples

Here are some example GraphQL queries and mutations:

1. Register a new user:

   ```graphql
   mutation RegisterUser($input: CreateUserInput!) {
     register(input: $input) {
       token
       user {
         id
         username
         email
         role
       }
     }
   }
   ```

   Variables:

   ```json
   {
     "input": {
       "username": "newuser",
       "email": "newuser@example.com",
       "password": "password123"
     }
   }
   ```

2. Login:

   ```graphql
   mutation LoginUser($email: String!, $password: String!) {
     login(email: $email, password: $password) {
       token
       user {
         id
         username
         email
         role
       }
     }
   }
   ```

   Variables:

   ```json
   {
     "email": "newuser@example.com",
     "password": "password123"
   }
   ```

3. Create a new question:

   ```graphql
   mutation CreateQuestion($input: CreateQuestionInput!) {
     createQuestion(input: $input) {
       id
       prompt
       questionText
       answers
       correctAnswer
       points
       createdBy {
         id
         username
       }
     }
   }
   ```

   Variables:

   ```json
   {
     "input": {
       "prompt": "Consider the following geographical question:",
       "questionText": "What is the capital of France?",
       "answers": ["London", "Berlin", "Paris", "Madrid"],
       "correctAnswer": "Paris",
       "points": 2
     }
   }
   ```

4. Get all questions:

   ```graphql
   query GetQuestions {
     questions {
       id
       prompt
       questionText
       answers
       correctAnswer
       points
       createdBy {
         id
         username
       }
     }
   }
   ```

5. Get a specific question by ID:

   ```graphql
   query GetQuestion($id: ID!) {
     question(id: $id) {
       id
       prompt
       questionText
       answers
       correctAnswer
       points
       createdBy {
         id
         username
       }
     }
   }
   ```

   Variables:

   ```json
   {
     "id": "question_id_here"
   }
   ```

For a complete list of available queries and mutations, refer to the GraphQL schema in `src/schema/` directory.

For detailed information about recent changes and updates to the API, please refer to the `CHANGELOG.md` file in the project root.

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
├── .env                # Environment variables
├── ecosystem.config.js # PM2 configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── CHANGELOG.md        # Documentation of all notable changes
└── README.md           # Project documentation
```

## Error Handling and Logging

The application uses a custom error handling mechanism defined in `src/utils/errors.ts`. It includes various error types such as `AuthenticationError`, `ForbiddenError`, and `NotFoundError`.

Logging is implemented using Winston. Logs are configured in `src/utils/logger.ts` and can be adjusted as needed.

## Security

The Quiz API implements several security measures to ensure the protection of user data and the integrity of the system:

- **Authentication:**

  - JWT-based authentication for secure user sessions
  - Password hashing using bcrypt to protect user credentials
  - Support for Google OAuth for additional login options

- **Authorization:**

  - Role-based access control (RBAC) to manage user permissions
  - Granular permission checks for all API operations

- **Data Protection:**

  - Input validation and sanitization to prevent injection attacks
  - CORS configuration to control access from different origins

- **API Security:**

  - Rate limiting to prevent abuse and DDoS attacks
  - GraphQL query complexity analysis to prevent resource-intensive queries

- **Infrastructure Security:**

  - Helmet.js for setting various HTTP headers to enhance security
  - Secure configuration for production environments

- **Monitoring and Logging:**
  - Error logging for security events and suspicious activities
  - Regular review of logs and security alerts

For a comprehensive overview of our security practices and guidelines, please refer to the `SecurityChecklist.md` file in the project root. This checklist covers various aspects of API security, including:

- Detailed authentication and authorization practices
- Input validation and sanitization techniques
- Rate limiting and DDoS protection strategies
- Error handling and information disclosure policies
- Data protection measures
- GraphQL-specific security considerations
- And more...

We strongly recommend reviewing this checklist regularly and ensuring that all security measures are properly implemented and up-to-date.

**Note:** Security is an ongoing process. We conduct regular security audits and updates to address new vulnerabilities and implement best practices. Contributors are encouraged to report any security issues or suggest improvements.

## Testing

Run the test suite with:

```
pnpm test
```

For watch mode:

```
pnpm run test:watch
```

Tests are located in the `src/__tests__/` directory and include unit tests for resolvers and integration tests for the API.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

Please ensure your code adheres to the existing style and passes all tests.

## License

This project is licensed under the ISC License.
