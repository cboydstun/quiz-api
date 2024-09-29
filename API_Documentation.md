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

[... rest of the Question Queries and Mutations remain unchanged ...]

## Authentication Queries and Mutations

[... rest of the Authentication Queries and Mutations remain unchanged ...]

## Leaderboard Queries

[... Leaderboard Queries remain unchanged ...]

## Error Handling and Edge Cases

[... Error Handling and Edge Cases remain unchanged ...]

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
