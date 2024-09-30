import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Question, IQuestion } from './models/Question';
import { User, IUser } from './models/User'; // Import User model and interface
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

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

    // Delete existing questions and users
    await Question.deleteMany({});
    await User.deleteMany({});
    console.log('Deleted existing questions and users');

    // Read questions from JSON file
    const questionsJson = await fs.readFile(path.join(__dirname, '.','seedQuestions.json'), 'utf-8');
    const questionsData: Omit<IQuestion, '_id' | 'createdBy'>[] = JSON.parse(questionsJson);

    // Read users from JSON file
    const usersJson = await fs.readFile(path.join(__dirname, '.','seedUsers.json'), 'utf-8');
    const usersData: Omit<IUser, '_id'>[] = JSON.parse(usersJson);

    // Insert new users
    const createdUsers = await Promise.all(usersData.map(async (userData) => {
      if (!userData.password) {
        throw new Error('User password is undefined');
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword,
      });
      return user.save();
    }));

    console.log(`Seeded ${createdUsers.length} users`);

    // Insert new questions
    const createdQuestions = await Promise.all(questionsData.map(async (questionData) => {
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const question = new Question({
        ...questionData,
        createdBy: randomUser._id,
      });
      return question.save();
    }));

    console.log(`Seeded ${createdQuestions.length} questions`);

    // Update users with created questions
    await Promise.all(createdUsers.map(async (user) => {
      const userQuestions = createdQuestions.filter(q => q.createdBy.toString() === user._id.toString());
      user.createdQuestions = userQuestions.map(q => q._id);
      return user.save();
    }));

    console.log('Updated users with created questions');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase().catch(console.error);