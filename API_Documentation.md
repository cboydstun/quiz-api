# API Documentation

This document provides examples of all queries and mutations available in the Quiz API.

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
      skills
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
      skills
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

Retrieves the information of the currently authenticated user, including the total number of questions answered.

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
    skills
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

Retrieves a list of all users in the system, including their total number of questions answered.

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
    skills
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

Retrieves information about a specific user by their ID, including their total number of questions answered.

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
    skills
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

Updates the statistics for a specific user, including the total number of questions answered.

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
    skills
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

### Get all questions

Retrieves a list of all questions in the system.

```graphql
query GetQuestions {
  questions {
    id
    prompt
    questionText
    answers
    correctAnswer
    hint
    points
    createdBy {
      id
      username
    }
  }
}
```

### Get a specific question by ID

```graphql
query GetQuestion($id: ID!) {
  question(id: $id) {
    id
    prompt
    questionText
    answers
    correctAnswer
    hint
    points
    createdBy {
      id
      username
    }
  }
}
```

### Create a new question (requires editor or admin permission)

```graphql
mutation CreateQuestion($input: CreateQuestionInput!) {
  createQuestion(input: $input) {
    id
    prompt
    questionText
    answers
    correctAnswer
    hint
    points
    createdBy {
      id
      username
    }
  }
}
```

### Update an existing question (requires editor or admin permission)

```graphql
mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
  updateQuestion(id: $id, input: $input) {
    id
    prompt
    questionText
    answers
    correctAnswer
    hint
    points
    createdBy {
      id
      username
    }
  }
}
```

### Delete a question (requires editor or admin permission)

```graphql
mutation DeleteQuestion($id: ID!) {
  deleteQuestion(id: $id)
}
```

### Submit an answer

Submits a user's answer to a specific question.

```graphql
mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
  submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
    success
    isCorrect
  }
}
```

### Get user responses (requires authentication)

Retrieves a list of the current user's responses to questions.

```graphql
query GetUserResponses {
  userResponses {
    questionId {
      id
      prompt
    }
    selectedAnswer
    isCorrect
  }
}
```

## Authentication Queries and Mutations

### Get Google Auth URL

Retrieves the URL for Google OAuth authentication.

```graphql
query GetGoogleAuthUrl {
  getGoogleAuthUrl {
    url
  }
}
```

### Authenticate with Google

Authenticates a user using a Google OAuth code.

```graphql
mutation AuthenticateWithGoogle($code: String!) {
  authenticateWithGoogle(code: $code) {
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
      skills
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

## Leaderboard Queries

### Get Leaderboard

Retrieves the leaderboard with an optional limit on the number of entries.

```graphql
query GetLeaderboard($limit: Int) {
  getLeaderboard(limit: $limit) {
    leaderboard {
      position
      user {
        id
        username
        email
        role
        score
      }
      score
    }
    currentUserEntry {
      position
      user {
        id
        username
        email
        role
        score
      }
      score
    }
  }
}
```

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

Input type for creating a new question.

```graphql
input CreateQuestionInput {
  prompt: String!
  questionText: String!
  answers: [String!]!
  correctAnswer: String!
  hint: String
  points: Int
}
```

### UpdateQuestionInput

Input type for updating an existing question.

```graphql
input UpdateQuestionInput {
  prompt: String
  questionText: String
  answers: [String!]
  correctAnswer: String
  hint: String
  points: Int
}
```

### UserStatsInput

Input type for updating user statistics.

```graphql
input UserStatsInput {
  questionsAnswered: Int
  questionsCorrect: Int
  questionsIncorrect: Int
  pointsEarned: Int
  newSkills: [String!]
  consecutiveLoginDays: Int
  lifetimePoints: Int
  yearlyPoints: Int
  monthlyPoints: Int
  dailyPoints: Int
  lastLoginDate: String
}
```

### Role (Enum)

Enum representing user roles in the system.

```graphql
enum Role {
  USER
  EDITOR
  ADMIN
  SUPER_ADMIN
}
```

## Error Handling

The API uses custom error types to handle various error scenarios. These include:

- AuthenticationError: Thrown when authentication fails or is required.
- ForbiddenError: Thrown when a user doesn't have permission to perform an action.
- UserInputError: Thrown when user input is invalid.
- NotFoundError: Thrown when a requested resource is not found.
- ValidationError: Thrown when input validation fails.

Errors are returned in the GraphQL response under the `errors` field, with appropriate error codes and messages.

## Notes

- All mutations and queries that require authentication should include the JWT token in the Authorization header as a Bearer token.
- Admin-only operations require the user to have the ADMIN or SUPER_ADMIN role.
- Editor operations (like creating or updating questions) require the user to have the EDITOR, ADMIN, or SUPER_ADMIN role.
- The API implements rate limiting to prevent abuse. Excessive requests may be temporarily blocked.
- Email addresses in the leaderboard query results are masked for privacy.
- The `questionsAnswered` field in user queries and mutations represents the total number of questions a user has ever answered. This allows users to track their progress over time.
- GitHub Actions CI/CD Pipeline enabled.
