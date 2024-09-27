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

Quiz API is a GraphQL-based backend service for managing quizzes, questions, and user interactions. It provides functionality for user authentication, question management, and leaderboard tracking.

## Features

- User authentication (local and Google OAuth)
- CRUD operations for quiz questions
- User response tracking
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

## Running the Application

1. For development:

   ```
   npm run dev
   ```

2. For production:
   ```
   npm run build
   npm start
   ```

The API will be available at `http://localhost:4000/graphql` (or the port you specified in the .env file).

## API Usage Examples

Here are some example GraphQL queries and mutations:

1. Create a new user:

   ```graphql
   mutation {
     register(
       input: {
         username: "testuser"
         email: "test@example.com"
         password: "password123"
       }
     ) {
       id
       username
       email
     }
   }
   ```

2. Login:

   ```graphql
   mutation {
     login(input: { email: "test@example.com", password: "password123" }) {
       token
       user {
         id
         username
         email
       }
     }
   }
   ```

3. Create a new question:

   ```graphql
   mutation {
     createQuestion(
       input: {
         prompt: "What is the capital of France?"
         questionText: "Choose the correct answer:"
         answers: ["London", "Berlin", "Paris", "Madrid"]
         correctAnswer: "Paris"
         points: 2
       }
     ) {
       id
       prompt
       questionText
       answers
       correctAnswer
       points
     }
   }
   ```

4. Get all questions:

   ```graphql
   query {
     questions {
       id
       prompt
       questionText
       answers
       points
     }
   }
   ```

5. Get leaderboard:
   ```graphql
   query {
     leaderboard {
       user {
         username
       }
       score
     }
   }
   ```

For a complete list of available queries and mutations, refer to the GraphQL schema in `src/schema/` directory.

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
│   └── index.ts        # Application entry point
├── .env                # Environment variables
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Error Handling and Logging

The application uses a custom error handling mechanism defined in `src/utils/errors.ts`. It includes various error types such as `AuthenticationError`, `ForbiddenError`, and `NotFoundError`.

Logging is implemented using Winston. Logs are configured in `src/utils/logger.ts` and can be adjusted as needed.

## Security

The Quiz API implements several security measures:

- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control
- Rate limiting to prevent abuse
- CORS configuration
- Helmet.js for setting various HTTP headers

Refer to `SecurityChecklist.md` for more details on security implementations.

## Testing

Run the test suite with:

```
npm test
```

For watch mode:

```
npm run test:watch
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
