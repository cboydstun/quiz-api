import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";

export interface IQuestion extends Document {
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  hint: string;
  createdBy: IUser["_id"];
}

const QuestionSchema: Schema = new Schema({
  prompt: { type: String, required: true },
  questionText: { type: String, required: true },
  answers: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  hint: { type: String, required: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const Question: Model<IQuestion> = mongoose.model<IQuestion>(
  "Question",
  QuestionSchema
);

export default Question;
