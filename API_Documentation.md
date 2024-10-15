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

## User Queries and Mutations

### Register a new user

Registers a new user with the provided username, email, and password.

```graphql
mutation RegisterUser($input: CreateUserInput!) {
  register(input: $input) {
    token
    user {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
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
    "password": "password123",
    "role": "USER"
  }
}
```

### Login

Authenticates a user with their email and password.

```graphql
mutation LoginUser($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      username
      email
      role
      score
      questionsAnswered
      questionsCorrect
      questionsIncorrect
      badges {
        id
        name
        description
        earnedAt
      }
      lifetimePoints
      yearlyPoints
      monthlyPoints
      dailyPoints
      consecutiveLoginDays
      lastLoginDate
      createdAt
      updatedAt
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

### Get current user (requires authentication)

Retrieves the information of the currently authenticated user, including the total number of questions answered and earned badges.

```graphql
query Me {
  me {
    id
    username
    email
    role
    score
    questionsAnswered
    questionsCorrect
    questionsIncorrect
    badges {
      id
      name
      description
      earnedAt
    }
    lifetimePoints
    yearlyPoints
    monthlyPoints
    dailyPoints
    consecutiveLoginDays
    lastLoginDate
    createdAt
    updatedAt
  }
}
```

### Get all users (requires admin permission)

Retrieves a list of all users in the system, including their total number of questions answered and earned badges.

```graphql
query GetUsers {
  users {
    id
    username
    email
    role
    score
    questionsAnswered
    questionsCorrect
    questionsIncorrect
    badges {
      id
      name
      description
      earnedAt
    }
    lifetimePoints
    yearlyPoints
    monthlyPoints
    dailyPoints
    consecutiveLoginDays
    lastLoginDate
    createdAt
    updatedAt
  }
}
```

### Get a specific user by ID (requires admin permission)

Retrieves information about a specific user by their ID, including their total number of questions answered and earned badges.

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    username
    email
    role
    score
    questionsAnswered
    questionsCorrect
    questionsIncorrect
    badges {
      id
      name
      description
      earnedAt
    }
    lifetimePoints
    yearlyPoints
    monthlyPoints
    dailyPoints
    consecutiveLoginDays
    lastLoginDate
    createdAt
    updatedAt
  }
}
```

### Change user role (requires admin permission)

Changes the role of a specific user.

```graphql
mutation ChangeUserRole($userId: ID!, $newRole: Role!) {
  changeUserRole(userId: $userId, newRole: $newRole) {
    id
    username
    email
    role
  }
}
```

### Delete user (requires admin permission)

Deletes a user from the system.

```graphql
mutation DeleteUser($userId: ID!) {
  deleteUser(userId: $userId)
}
```

### Update user stats (requires admin permission)

Updates the statistics for a specific user, including the total number of questions answered and adds a new badge if provided.

```graphql
mutation UpdateUserStats($userId: ID!, $stats: UserStatsInput!) {
  updateUserStats(userId: $userId, stats: $stats) {
    id
    username
    email
    role
    score
    questionsAnswered
    questionsCorrect
    questionsIncorrect
    badges {
      id
      name
      description
      earnedAt
    }
    lifetimePoints
    yearlyPoints
    monthlyPoints
    dailyPoints
    consecutiveLoginDays
    lastLoginDate
    updatedAt
  }
}
```

### Update login streak (requires admin permission)

Updates the login streak for a specific user.

```graphql
mutation UpdateLoginStreak($userId: ID!) {
  updateLoginStreak(userId: $userId) {
    username
    consecutiveLoginDays
    lastLoginDate
  }
}
```

### Update username (requires authentication)

Updates the username of the authenticated user.

```graphql
mutation UpdateUsername($username: String!) {
  updateUsername(username: $username) {
    id
    username
  }
}
```

### Update password (requires authentication)

Updates the password of the authenticated user.

```graphql
mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
  updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    success
    message
  }
}
```

## Question Queries and Mutations

(No changes needed in this section)

## Authentication Queries and Mutations

(No changes needed in this section)

## Leaderboard Queries

(No changes needed in this section)

## Input Types

### CreateUserInput

Input type for registering a new user.

```graphql
input CreateUserInput {
  username: String!
  email: String!
  password: String!
  role: Role
}
```

### CreateQuestionInput

(No changes needed)

### UpdateQuestionInput

(No changes needed)

### UserStatsInput

Input type for updating user statistics.

```graphql
input UserStatsInput {
  questionsAnswered: Int
  questionsCorrect: Int
  questionsIncorrect: Int
  pointsEarned: Int
  newBadge: BadgeInput
  consecutiveLoginDays: Int
  lifetimePoints: Int
  yearlyPoints: Int
  monthlyPoints: Int
  dailyPoints: Int
  lastLoginDate: String
}
```

### BadgeInput

Input type for adding a new badge to a user.

```graphql
input BadgeInput {
  name: String!
  description: String!
}
```

### Role (Enum)

(No changes needed)

## Error Handling

(No changes needed)

## Notes

- All mutations and queries that require authentication should include the JWT token in the Authorization header as a Bearer token.
- Admin-only operations require the user to have the ADMIN or SUPER_ADMIN role.
- Editor operations (like creating or updating questions) require the user to have the EDITOR, ADMIN, or SUPER_ADMIN role.
- The API implements rate limiting to prevent abuse. Excessive requests may be temporarily blocked.
- Email addresses in the leaderboard query results are masked for privacy.
- The `questionsAnswered` field in user queries and mutations represents the total number of questions a user has ever answered. This allows users to track their progress over time.
- Badges represent achievements earned by users. They can be awarded for various accomplishments such as answering a certain number of questions, maintaining a login streak, or achieving a perfect score on a quiz.
- GitHub Actions CI/CD Pipeline enabled.
