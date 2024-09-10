# User Queries and Mutations

# Register a new user

```gql
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

# Login

```gql
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

# Get current user (requires authentication)

```gql
query Me {
  me {
    id
    username
    email
    role
  }
}
```

# Get all users (requires admin permission)

```gql
query AllUsers {
  users {
    id
    username
    email
    role
  }
}
```

# Get a specific user by ID (requires admin permission)

```gql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    username
    email
    role
  }
}
```

# Change user role (requires admin permission)

```gql
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

```gql
mutation CreateQuestion {
  createQuestion(
    input: {
      prompt: "Consider the following geographical question:"
      questionText: "What is the capital of France?"
      answers: ["London", "Berlin", "Paris", "Madrid"]
      correctAnswer: "Paris"
    }
  ) {
    id
    prompt
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

```gql
query AllQuestions {
  questions {
    id
    prompt
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

```gql
query GetQuestion($questionId: ID!) {
  question(id: $questionId) {
    id
    prompt
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

```gql
mutation UpdateQuestion($questionId: ID!) {
  updateQuestion(
    id: $questionId
    input: {
      prompt: "Let's revisit this geographical question:"
      questionText: "Updated: What is the capital of France?"
      answers: ["London", "Berlin", "Paris", "Rome"]
      correctAnswer: "Paris"
    }
  ) {
    id
    prompt
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

```gql
mutation DeleteQuestion($questionId: ID!) {
  deleteQuestion(id: $questionId)
}
```

# Error Handling and Edge Cases

# Try to register with an existing email

```gql
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

```gql
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

```gql
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

```gql
mutation ChangeToSUPER_ADMIN($userId: ID!) {
  changeUserRole(userId: $userId, newRole: SUPER_ADMIN) {
    id
    username
    role
  }
}
```

# Try to update a non-existent question

```gql
mutation UpdateNonExistentQuestion {
  updateQuestion(
    id: "non-existent-id"
    input: {
      prompt: "This is a non-existent question:"
      questionText: "This question doesn't exist"
      answers: ["A", "B", "C"]
      correctAnswer: "A"
    }
  ) {
    id
    prompt
    questionText
  }
}
```

# Try to delete a non-existent question

```gql
mutation DeleteNonExistentQuestion {
  deleteQuestion(id: "non-existent-id")
}
```
