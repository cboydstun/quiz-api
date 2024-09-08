// src/models/Question.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  questionText: string;
  answers: string[];
  correctAnswer: string;
  createdBy: Schema.Types.ObjectId;
}

const QuestionSchema: Schema = new Schema({
  questionText: { type: String, required: true },
  answers: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export default mongoose.model<IQuestion>("Question", QuestionSchema);
