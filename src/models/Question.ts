// src/models/Question.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuestion extends Document {
  questionText: string;
  answers: string[];
  correctAnswer: string;
  createdBy: string;
}

const QuestionSchema: Schema = new Schema({
  questionText: { type: String, required: true },
  answers: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

const Question: Model<IQuestion> = mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;