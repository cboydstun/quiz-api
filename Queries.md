# User Queries and Mutations

# Register a new user x

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
    }
  }
}
```

# Login x

```graphql
mutation Login {
  login(email: "newuser@example.com", password: "password123") {
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

# Get current user (requires authentication) x

```graphql
query Me {
  me {
    id
    username
    email
    role
  }
}
```

# Get all users (requires admin permission) x

```graphql
query AllUsers {
  users {
    id
    username
    email
    role
  }
}
```

# Get a specific user by ID (requires admin permission) x

```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    username
    email
    role
  }
}
```

# Change user role (requires admin permission) x

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

# Question Queries and Mutations

# Create a new question (requires editor permission or higher)

```graphql
mutation CreateQuestion {
  createQuestion(
    input: {
      questionText: "What is the capital of France?"
      answers: ["London", "Berlin", "Paris", "Madrid"]
      correctAnswer: "Paris"
    }
  ) {
    id
    questionText
    answers
    correctAnswer
    createdBy {
      id
      username
    }
  }
}
```

# Get all questions

```graphql
query AllQuestions {
  questions {
    id
    questionText
    answers
    correctAnswer
    createdBy {
      id
      username
    }
  }
}
```

# Get a specific question by ID

```graphql
query GetQuestion($questionId: ID!) {
  question(id: $questionId) {
    id
    questionText
    answers
    correctAnswer
    createdBy {
      id
      username
    }
  }
}
```

# Update a question (requires editor permission or higher)

```graphql
mutation UpdateQuestion($questionId: ID!) {
  updateQuestion(
    id: $questionId
    input: {
      questionText: "Updated: What is the capital of France?"
      answers: ["London", "Berlin", "Paris", "Rome"]
      correctAnswer: "Paris"
    }
  ) {
    id
    questionText
    answers
    correctAnswer
    createdBy {
      id
      username
    }
  }
}
```

# Delete a question (requires editor permission or higher)

```graphql
mutation DeleteQuestion($questionId: ID!) {
  deleteQuestion(id: $questionId)
}
```

# Error Handling and Edge Cases

# Try to register with an existing email

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

# Try to login with incorrect credentials

```graphql
mutation IncorrectLogin {
  login(email: "newuser@example.com", password: "wrongpassword") {
    token
    user {
      id
      username
      email
    }
  }
}
```

# Try to access admin-only query as a regular user

```graphql
query UnauthorizedUsersAccess {
  users {
    id
    username
    email
    role
  }
}
```

# Try to change role to SUPER_ADMIN (should be forbidden)

```graphql
mutation ChangeTo#SUPER_ADMIN($userId: ID!) {
changeUserRole(userId: $userId, newRole: SUPER_ADMIN) {
id
username
role
}
}
```

# Try to update a non-existent question

```graphql
mutation UpdateNonExistentQuestion {
  updateQuestion(
    id: "non-existent-id"
    input: {
      questionText: "This question doesn't exist"
      answers: ["A", "B", "C"]
      correctAnswer: "A"
    }
  ) {
    id
    questionText
  }
}
```

# Try to delete a non-existent question

```graphql
mutation DeleteNonExistentQuestion {
  deleteQuestion(id: "non-existent-id")
}
```
