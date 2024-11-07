import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./User";

// Supporting interfaces
interface ISourceReference {
  page: number;
  chapter?: string;
  section?: string;
  paragraph?: string;
  lines: {
    start: number;
    end: number;
  };
  text: string;
}

interface ITopicReference {
  mainTopic: string;
  subTopics: string[];
}

export interface IQuestion extends Document {
  prompt: string;
  questionText: string;
  answers: {
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'multiple_choice' | 'true-false' | 'fill-in-blank';
  topics: ITopicReference;
  sourceReferences: ISourceReference[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: IUser["_id"];
    lastModifiedBy: IUser["_id"];
    version: number;
    status: 'draft' | 'review' | 'active' | 'archived';
  };
  learningObjectives: string[];
  relatedQuestions?: mongoose.Types.ObjectId[];
  stats?: {
    timesAnswered: number;
    correctAnswers: number;
    averageTimeToAnswer: number;
    difficultyRating: number;
  };
  tags: string[];
  hint?: string;
  points: number;
  feedback: {
    correct: string;
    incorrect: string;
  };
}

const SourceReferenceSchema = new Schema({
  page: { type: Number, required: true },
  chapter: { type: String },
  section: { type: String },
  paragraph: { type: String },
  lines: {
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  text: { type: String, required: true }
});

const TopicReferenceSchema = new Schema({
  mainTopic: { type: String, required: true },
  subTopics: [{ type: String }]
});

const QuestionSchema: Schema = new Schema({
  prompt: { type: String, required: true },
  questionText: { type: String, required: true },
  answers: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    explanation: { type: String }
  }],
  difficulty: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced'],
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true-false', 'fill-in-blank'],
    required: true
  },
  topics: { type: TopicReferenceSchema, required: true },
  sourceReferences: [{ type: SourceReferenceSchema, required: true }],
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'review', 'active', 'archived'],
      default: 'draft'
    }
  },
  learningObjectives: [{ type: String }],
  relatedQuestions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  stats: {
    timesAnswered: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    averageTimeToAnswer: { type: Number, default: 0 },
    difficultyRating: { type: Number, min: 1, max: 5, default: 3 }
  },
  tags: [{ type: String }],
  hint: { type: String },
  points: { type: Number, required: true, default: 1 },
  feedback: {
    correct: { type: String, required: true },
    incorrect: { type: String, required: true }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
QuestionSchema.index({ 'topics.mainTopic': 1 });
QuestionSchema.index({ 'sourceReferences.page': 1 });
QuestionSchema.index({ 'metadata.status': 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ difficulty: 1 });

export const Question: Model<IQuestion> = mongoose.model<IQuestion>(
  "Question",
  QuestionSchema
);

export default Question;


// This schema:

// 1. **Source References**: Precise tracking of where content comes from in the source material, including page numbers, chapters, and line numbers that map to the JSON structure.

// 2. **Topic Organization**: Hierarchical topic structure that mirrors the document's chapter/section organization.

// 3. **Question Metadata**: Better tracking of question lifecycle, including versioning and status.

// 4. **Enhanced Answer Structure**: More detailed answer structure with explanations for each option.

// 5. **Statistics Tracking**: Built-in tracking of question performance and difficulty.

// 6. **Learning Objectives**: Explicit linking to learning objectives from the source material.

// 7. **Related Content**: Ability to link related questions together.

// 8. **Indexing**: Strategic indexes for efficient querying of commonly accessed fields.

// This schema would allow you to:
// - Track exactly where in the source material each question comes from
// - Maintain question quality through versioning and review processes
// - Analyze question effectiveness through statistics
// - Group questions by topics and learning objectives
// - Provide better feedback to users
// - Efficiently query and retrieve questions based on various criteria