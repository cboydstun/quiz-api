## Question Queries and Mutations

### Get all questions

Retrieves a list of all questions in the system.

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
    relatedQuestions {
      id
      questionText
    }
    stats {
      timesAnswered
      correctAnswers
      averageTimeToAnswer
      difficultyRating
    }
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

### Get a specific question

Retrieves a specific question by its ID.

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
    relatedQuestions {
      id
      questionText
    }
    stats {
      timesAnswered
      correctAnswers
      averageTimeToAnswer
      difficultyRating
    }
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

### Get questions by topic

Retrieves questions filtered by main topic.

```graphql
query GetQuestionsByTopic($mainTopic: String!) {
  questionsByTopic(mainTopic: $mainTopic) {
    id
    questionText
    topics {
      mainTopic
      subTopics
    }
  }
}
```

### Get questions by difficulty

Retrieves questions filtered by difficulty level.

```graphql
query GetQuestionsByDifficulty($difficulty: QuestionDifficulty!) {
  questionsByDifficulty(difficulty: $difficulty) {
    id
    questionText
    difficulty
  }
}
```

### Get user responses

Retrieves the responses of the authenticated user.

```graphql
query GetUserResponses {
  userResponses {
    id
    questionId {
      id
      questionText
    }
    selectedAnswer
    isCorrect
    timeToAnswer
  }
}
```

### Create a new question (requires EDITOR, ADMIN, or SUPER_ADMIN role)

Creates a new question in the system.

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

Example variables:

```json
{
  "input": {
    "prompt": "Consider the following code snippet...",
    "questionText": "What would be the output of this code?",
    "answers": [
      {
        "text": "It will print 'Hello World'",
        "isCorrect": true,
        "explanation": "The console.log statement outputs the string directly"
      },
      {
        "text": "It will throw an error",
        "isCorrect": false,
        "explanation": "The code is syntactically correct and will execute without errors"
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

### Update a question (requires EDITOR, ADMIN, or SUPER_ADMIN role)

Updates an existing question in the system.

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

### Delete a question (requires EDITOR, ADMIN, or SUPER_ADMIN role)

Deletes a question from the system.

```graphql
mutation DeleteQuestion($id: ID!) {
  deleteQuestion(id: $id)
}
```

### Submit an answer

Submits an answer for a specific question.

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
