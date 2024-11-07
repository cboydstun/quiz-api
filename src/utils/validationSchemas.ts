// src/utils/validationSchemas.ts

import * as yup from 'yup';

const linesSchema = yup.object().shape({
  start: yup.number().required('Start line is required').min(0, 'Start line must be non-negative'),
  end: yup.number().required('End line is required').min(0, 'End line must be non-negative')
    .test('is-greater-than-start', 'End line must be greater than or equal to start line',
      function (value) {
        return value >= this.parent.start;
      }
    ),
});

const sourceReferenceSchema = yup.object().shape({
  page: yup.number().required('Page number is required').positive('Page number must be positive'),
  chapter: yup.string(),
  section: yup.string(),
  paragraph: yup.string(),
  lines: linesSchema.required('Lines are required'),
  text: yup.string().required('Reference text is required'),
});

const topicReferenceSchema = yup.object().shape({
  mainTopic: yup.string().required('Main topic is required'),
  subTopics: yup.array().of(yup.string()).required('Sub topics are required'),
});

const questionAnswerSchema = yup.object().shape({
  text: yup.string().required('Answer text is required'),
  isCorrect: yup.boolean().required('isCorrect flag is required'),
  explanation: yup.string(),
});

const feedbackSchema = yup.object().shape({
  correct: yup.string().required('Correct feedback is required'),
  incorrect: yup.string().required('Incorrect feedback is required'),
});

export const createQuestionSchema = yup.object().shape({
  prompt: yup.string().required('Prompt is required').min(3, 'Prompt must be at least 3 characters'),
  questionText: yup.string().required('Question text is required').min(5, 'Question text must be at least 5 characters'),
  answers: yup.array()
    .of(questionAnswerSchema)
    .min(2, 'At least 2 answers are required')
    .required('Answers are required')
    .test('has-one-correct', 'At least one answer must be correct',
      (answers) => answers?.some(answer => answer.isCorrect)
    ),
  difficulty: yup.string()
    .oneOf(['basic', 'intermediate', 'advanced'], 'Invalid difficulty level')
    .required('Difficulty is required'),
  type: yup.string()
    .oneOf(['multiple_choice', 'true_false', 'fill_in_blank'], 'Invalid question type')
    .required('Question type is required'),
  topics: topicReferenceSchema.required('Topics are required'),
  sourceReferences: yup.array()
    .of(sourceReferenceSchema)
    .min(1, 'At least one source reference is required')
    .required('Source references are required'),
  learningObjectives: yup.array()
    .of(yup.string())
    .min(1, 'At least one learning objective is required')
    .required('Learning objectives are required'),
  relatedQuestions: yup.array().of(yup.string()),
  tags: yup.array()
    .of(yup.string())
    .required('Tags are required'),
  hint: yup.string(),
  points: yup.number()
    .positive('Points must be positive')
    .integer('Points must be an integer')
    .default(1),
  feedback: feedbackSchema.required('Feedback is required'),
});

export const updateQuestionSchema = createQuestionSchema.clone().shape({
  prompt: yup.string().min(3, 'Prompt must be at least 3 characters'),
  questionText: yup.string().min(5, 'Question text must be at least 5 characters'),
  answers: yup.array().of(questionAnswerSchema),
  difficulty: yup.string().oneOf(['basic', 'intermediate', 'advanced'], 'Invalid difficulty level'),
  type: yup.string().oneOf(['multiple_choice', 'true_false', 'fill_in_blank'], 'Invalid question type'),
  topics: topicReferenceSchema,
  sourceReferences: yup.array().of(sourceReferenceSchema),
  learningObjectives: yup.array().of(yup.string()),
  status: yup.string().oneOf(['draft', 'review', 'active', 'archived'], 'Invalid status'),
}).test('at-least-one-field', 'At least one field must be provided for update', (value) => {
  return Object.keys(value || {}).length > 0;
});

export const registerUserSchema = yup.object().shape({
  username: yup.string().required('Username is required').min(3, 'Username must be at least 3 characters'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
  role: yup.string().oneOf(['USER', 'ADMIN', 'EDITOR'], 'Invalid role').default('USER'),
});

export const loginUserSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});
