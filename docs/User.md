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

### Get a specific user by ID

Retrieves information about a specific user by their ID. The amount of information returned depends on the role of the requesting user.

For admin users:

```graphql
query GetUserFull($id: ID!) {
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

For regular users (when querying other users):

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    username
    role
    score
    questionsAnswered
    questionsCorrect
    questionsIncorrect
  }
}
```

Note: Regular users can see all fields for their own user data when using the `me` query.

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

### Submit answer (requires authentication)

Submits an answer for a specific question.

```graphql
mutation SubmitAnswer($questionId: ID!, $selectedAnswer: String!) {
  submitAnswer(questionId: $questionId, selectedAnswer: $selectedAnswer) {
    success
    isCorrect
  }
}
```
