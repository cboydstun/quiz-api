// src/models/UserResponse.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IUserResponse extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  selectedAnswer: string;
  isCorrect: boolean;
}

const UserResponseSchema: Schema = new Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  questionId: {
    type: mongoose.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
});

const UserResponse = mongoose.model<IUserResponse>(
  "UserResponse",
  UserResponseSchema
);

export default UserResponse;
