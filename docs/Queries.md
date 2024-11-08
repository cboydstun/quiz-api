# Queries and Mutations

This document provides examples of all queries and mutations available in the Quiz API, including some error handling and edge cases.

## User Queries and Mutations

### Register a new user

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
    "password": "password123"
  }
}
```

### Login

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

```graphql
mutation DeleteUser($userId: ID!) {
  deleteUser(userId: $userId)
}
```

### Update user stats (requires admin permission)

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

```graphql
mutation UpdateUsername($username: String!) {
  updateUsername(username: $username) {
    id
    username
  }
}
```

### Update password (requires authentication)

```graphql
mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
  updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    success
    message
  }
}
```

## Question Queries and Mutations

### Create a new question (requires editor permission or higher)

```graphql
mutation CreateQuestion($input: CreateQuestionInput!) {
  createQuestion(input: $input) {
    id
    prompt
    questionText
    answers {
      text
      isCorrect
      explanation
    }
    difficulty
    type
    topics {
      mainTopic
      subTopics
    }
    sourceReferences {
      page
      chapter
      section
      paragraph
      lines {
        start
        end
      }
      text
    }
    metadata {
      createdAt
      updatedAt
      createdBy {
        id
        username
      }
      lastModifiedBy {
        id
        username
      }
      version
      status
    }
    learningObjectives
    tags
    hint
    points
    feedback {
      correct
      incorrect
    }
  }
}
```

Variables:

```json
{
  "input": {
    "prompt": "Consider the following code snippet:",
    "questionText": "What would be the output of this code?",
    "answers": [
      {
        "text": "Hello World",
        "isCorrect": true,
        "explanation": "The console.log statement outputs the string directly"
      },
      {
        "text": "SyntaxError",
        "isCorrect": false,
        "explanation": "The code is syntactically correct"
      }
    ],
    "difficulty": "INTERMEDIATE",
    "type": "MULTIPLE_CHOICE",
    "topics": {
      "mainTopic": "JavaScript Basics",
      "subTopics": ["Console Output", "String Manipulation"]
    },
    "sourceReferences": [
      {
        "page": 42,
        "chapter": "Basic JavaScript",
        "section": "Console Methods",
        "lines": {
          "start": 15,
          "end": 20
        },
        "text": "The console.log() method outputs a message to the web console"
      }
    ],
    "learningObjectives": [
      "Understand basic console output in JavaScript",
      "Identify correct syntax for string output"
    ],
    "tags": ["javascript", "console", "basics"],
    "hint": "Look at the syntax of the console.log statement",
    "points": 10,
    "feedback": {
      "correct": "Great job! You understand how console.log works in JavaScript",
      "incorrect": "Remember that console.log outputs its arguments directly to the console"
    }
  }
}
```

### Get all questions

```graphql
query GetQuestions {
  questions {
    id
    prompt
    questionText
    answers {
      text
      isCorrect
      explanation
    }
    difficulty
    type
    topics {
      mainTopic
      subTopics
    }
    metadata {
      createdAt
      updatedAt
      createdBy {
        id
        username
      }
      version
      status
    }
    stats {
      timesAnswered
      correctAnswers
      averageTimeToAnswer
      difficultyRating
    }
    tags
    points
  }
}
```

### Get questions by topic

```graphql
query GetQuestionsByTopic($mainTopic: String!) {
  questionsByTopic(mainTopic: $mainTopic) {
    id
    questionText
    topics {
      mainTopic
      subTopics
    }
    difficulty
    type
  }
}
```

### Get questions by difficulty

```graphql
query GetQuestionsByDifficulty($difficulty: QuestionDifficulty!) {
  questionsByDifficulty(difficulty: $difficulty) {
    id
    questionText
    difficulty
    type
    points
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
    answers {
      text
      isCorrect
      explanation
    }
    difficulty
    type
    topics {
      mainTopic
      subTopics
    }
    sourceReferences {
      page
      chapter
      section
      paragraph
      lines {
        start
        end
      }
      text
    }
    metadata {
      createdAt
      updatedAt
      createdBy {
        id
        username
      }
      lastModifiedBy {
        id
        username
      }
      version
      status
    }
    learningObjectives
    tags
    hint
    points
    feedback {
      correct
      incorrect
    }
  }
}
```

### Update a question (requires editor permission or higher)

```graphql
mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
  updateQuestion(id: $id, input: $input) {
    id
    prompt
    questionText
    answers {
      text
      isCorrect
      explanation
    }
    difficulty
    type
    topics {
      mainTopic
      subTopics
    }
    metadata {
      version
      status
    }
    learningObjectives
    tags
    points
    feedback {
      correct
      incorrect
    }
  }
}
```

### Delete a question (requires editor permission or higher)

```graphql
mutation DeleteQuestion($id: ID!) {
  deleteQuestion(id: $id)
}
```

### Submit answer to a question

```graphql
mutation SubmitAnswer(
  $questionId: ID!
  $selectedAnswer: String!
  $timeToAnswer: Float!
) {
  submitAnswer(
    questionId: $questionId
    selectedAnswer: $selectedAnswer
    timeToAnswer: $timeToAnswer
  ) {
    success
    isCorrect
    feedback
    points
    stats {
      timesAnswered
      correctAnswers
      averageTimeToAnswer
    }
  }
}
```

### View User Response History

```graphql
query GetUserResponses {
  userResponses {
    questionId {
      id
      questionText
      difficulty
      type
      topics {
        mainTopic
        subTopics
      }
    }
    selectedAnswer
    isCorrect
    timeToAnswer
  }
}
```

## Error Handling and Edge Cases

### Try to register with an existing email

```graphql
mutation RegisterExistingEmail($input: CreateUserInput!) {
  register(input: $input) {
    token
    user {
      id
      username
      email
    }
  }
}
```

Variables:

```json
{
  "input": {
    "username": "existinguser",
    "email": "newuser@example.com",
    "password": "password123"
  }
}
```

### Try to login with incorrect credentials

```graphql
mutation IncorrectLogin($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      username
      email
    }
  }
}
```

Variables:

```json
{
  "email": "newuser@example.com",
  "password": "wrongpassword"
}
```

### Try to access admin-only query as a regular user

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

### Try to change role to SUPER_ADMIN (should be forbidden)

```graphql
mutation ChangeToSUPER_ADMIN($userId: ID!, $newRole: Role!) {
  changeUserRole(userId: $userId, newRole: $newRole) {
    id
    username
    role
  }
}
```

Variables:

```json
{
  "userId": "user_id_here",
  "newRole": "SUPER_ADMIN"
}
```

### Try to update a non-existent question

```graphql
mutation UpdateNonExistentQuestion($id: ID!, $input: UpdateQuestionInput!) {
  updateQuestion(id: $id, input: $input) {
    id
    prompt
    questionText
  }
}
```

Variables:

```json
{
  "id": "non-existent-id",
  "input": {
    "prompt": "This is a non-existent question:",
    "questionText": "This question doesn't exist",
    "answers": ["A", "B", "C"],
    "correctAnswer": "A"
  }
}
```

### Try to delete a non-existent question

```graphql
mutation DeleteNonExistentQuestion($id: ID!) {
  deleteQuestion(id: $id)
}
```

Variables:

```json
{
  "id": "non-existent-id"
}
```