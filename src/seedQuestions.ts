import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Question, IQuestion } from './models/Question';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const connectDB: string = process.env.MONGO_URI as string;

if (!connectDB) {
  throw new Error('MONGO_URI environment variable is not set');
}

async function seedDatabase(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(connectDB);
    console.log('Connected to MongoDB');

    // Delete existing questions
    await Question.deleteMany({});
    console.log('Deleted existing questions');

    // Read questions from JSON file
    const questionsJson = await fs.readFile(path.join(__dirname, '.', 'seedQuestions.json'), 'utf-8');
    const questionsData: Omit<IQuestion, '_id' | 'createdBy'>[] = JSON.parse(questionsJson);

    // Insert new questions
    const createdQuestions = await Promise.all(questionsData.map(async (questionData) => {
      const question = new Question({
        ...questionData,
        createdBy: null, // Since no user creation is involved here
      });
      return question.save();
    }));

    console.log(`Seeded ${createdQuestions.length} questions`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase().catch(console.error);