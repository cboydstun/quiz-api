// src/models/User.ts

import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  role: string;
  googleId?: string;
  score: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  lifetimePoints: number;
  yearlyPoints: number;
  monthlyPoints: number;
  dailyPoints: number;
  consecutiveLoginDays: number;
  lastLoginDate: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdQuestions: mongoose.Types.ObjectId[];
}

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: {
    type: String,
    enum: ["USER", "EDITOR", "ADMIN", "SUPER_ADMIN"],
    default: "USER",
  },
  googleId: { type: String, unique: true, sparse: true },
  score: { type: Number, default: 0 },
  questionsAnswered: { type: Number, default: 0 },
  questionsCorrect: { type: Number, default: 0 },
  questionsIncorrect: { type: Number, default: 0 },
  lifetimePoints: { type: Number, default: 0 },
  yearlyPoints: { type: Number, default: 0 },
  monthlyPoints: { type: Number, default: 0 },
  dailyPoints: { type: Number, default: 0 },
  consecutiveLoginDays: { type: Number, default: 0 },
  lastLoginDate: { type: Date },
}, {
  timestamps: true // This will add createdAt and updatedAt fields
});

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);

export default User;
