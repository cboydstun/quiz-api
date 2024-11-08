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

### SourceReferenceInput

Input type for specifying source material references.

```graphql
input SourceReferenceInput {
  page: Int!
  chapter: String
  section: String
  paragraph: String
  lines: LinesInput!
  text: String!
}

input LinesInput {
  start: Int!
  end: Int!
}
```

### TopicReferenceInput

Input type for specifying question topics.

```graphql
input TopicReferenceInput {
  mainTopic: String!
  subTopics: [String!]!
}
```

### AnswerInput

Input type for question answers.

```graphql
input AnswerInput {
  text: String!
  isCorrect: Boolean!
  explanation: String
}
```

### CreateQuestionInput

Input type for creating a new question.

```graphql
input CreateQuestionInput {
  prompt: String!
  questionText: String!
  answers: [AnswerInput!]!
  difficulty: QuestionDifficulty!
  type: QuestionType!
  topics: TopicReferenceInput!
  sourceReferences: [SourceReferenceInput!]!
  learningObjectives: [String!]!
  relatedQuestions: [ID]
  tags: [String!]!
  hint: String
  points: Int!
  feedback: FeedbackInput!
}
```

### UpdateQuestionInput

Input type for updating an existing question.

```graphql
input UpdateQuestionInput {
  prompt: String
  questionText: String
  answers: [AnswerInput!]
  difficulty: QuestionDifficulty
  type: QuestionType
  topics: TopicReferenceInput
  sourceReferences: [SourceReferenceInput!]
  learningObjectives: [String!]
  relatedQuestions: [ID]
  tags: [String!]
  hint: String
  points: Int
  feedback: FeedbackInput
  status: QuestionStatus
}
```

### FeedbackInput

Input type for question feedback.

```graphql
input FeedbackInput {
  correct: String!
  incorrect: String!
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
  consecutiveLoginDays: Int
  lifetimePoints: Int
  yearlyPoints: Int
  monthlyPoints: Int
  dailyPoints: Int
  lastLoginDate: String
}
```

### QuestionDifficulty (Enum)

The difficulty level of a question:

```graphql
enum QuestionDifficulty {
  BASIC
  INTERMEDIATE
  ADVANCED
}
```

### QuestionType (Enum)

The type of question:

```graphql
enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_IN_BLANK
}
```

### QuestionStatus (Enum)

The status of a question in the system:

```graphql
enum QuestionStatus {
  DRAFT
  REVIEW
  ACTIVE
  ARCHIVED
}
```

### Role (Enum)

The Role enum represents the different user roles in the system:

```graphql
enum Role {
  USER
  ADMIN
  EDITOR
  SUPER_ADMIN
}
```
