// src/utils/validationSchemas.ts

import * as yup from 'yup';

export const createQuestionSchema = yup.object().shape({
  prompt: yup.string().required('Prompt is required').min(3, 'Prompt must be at least 3 characters'),
  questionText: yup.string().required('Question text is required').min(5, 'Question text must be at least 5 characters'),
  answers: yup.array().of(yup.string()).min(2, 'At least 2 answers are required').required('Answers are required'),
  correctAnswer: yup.string().required('Correct answer is required').test('is-in-answers', 'Correct answer must be one of the provided answers', function (value) {
    return this.parent.answers.includes(value);
  }),
  points: yup.number().positive('Points must be positive').integer('Points must be an integer').default(1),
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

// Add more schemas as needed for other operations