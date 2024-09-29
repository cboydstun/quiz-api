# API Documentation

This document provides examples of all queries and mutations available in the API.

## User Queries and Mutations

### Register a new user

Registers a new user with the provided username, email, and password.

```graphql
mutation RegisterUser {
  register(
    input: {
      username: "newuser"
      email: "newuser@example.com"
      password: "password123"
    }
  ) {
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

### Login

Authenticates a user with their email and password.

```graphql
mutation Login {
  login(email: "newuser@example.com", password: "password123") {
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

### Get current user (requires authentication)

Retrieves the information of the currently authenticated user.

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

Retrieves a list of all users in the system.

```graphql
query AllUsers {
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

Retrieves information about a specific user by their ID.

```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
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

Updates the statistics for a specific user.

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

## Question Queries and Mutations

-Get all questions - Retrieves a list of all questions in the system.

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

-Get a specific question by ID

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

-Create a new question (requires editor or admin permission)

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

-Update an existing question (requires editor or admin permission)

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

-Delete a question (requires editor or admin permission)

```graphql
mutation DeleteQuestion($id: ID!) {
  deleteQuestion(id: $id)
}
```

-Submits a user's answer to a specific question.

```graphql
mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
  submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
    success
    isCorrect
  }
}
```

-Get user responses (requires authentication) - Retrieves a list of the current user's responses to questions.

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

Get Google Auth URL

- Retrieves the URL for Google OAuth authentication.

```graphql
query GetGoogleAuthUrl {
  getGoogleAuthUrl {
    url
  }
}
```

Authenticate with Google

- Authenticates a user using a Google OAuth code.

```graphql
mutation AuthenticateWithGoogle($code: String!) {
  authenticateWithGoogle(code: $code) {
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

## Leaderboard Queries

### Get Leaderboard

-Retrieves the leaderboard with an optional limit on the number of entries.

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

Error Handling and Edge Cases
-### Try to register with an existing email +[... Error Handling and Edge Cases remain unchanged ...]

-Attempts to register a new user with an email that already exists in the system.

```graphql
mutation RegisterExistingEmail {
  register(
    input: {
      username: "existinguser"
      email: "newuser@example.com"
      password: "password123"
    }
  ) {
    token
    user {
      id
      username
      email
    }
  }
}
```

## Input Types

### RegisterInput

Input type for registering a new user.

```graphql
input RegisterInput {
  username: String!
  email: String!
  password: String!
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
