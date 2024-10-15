import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, IUser } from './models/User';
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

    // Delete existing users except for chrisboydstun@gmail.com
    await User.deleteMany({ email: { $ne: 'chrisboydstun@gmail.com' } });
    console.log('Deleted existing users except for chrisboydstun@gmail.com');

    // Read users from JSON file
    const usersJson = await fs.readFile(path.join(__dirname, '.', 'seedUsers.json'), 'utf-8');
    const usersData: Omit<IUser, '_id'>[] = JSON.parse(usersJson);

    // Get or create chrisboydstun@gmail.com user
    let chrisUser = await User.findOne({ email: 'chrisboydstun@gmail.com' });
    if (!chrisUser) {
      const chrisData = usersData.find(u => u.email === 'chrisboydstun@gmail.com');
      if (chrisData) {
        if (!chrisData.password) {
          throw new Error('Chris user password is undefined');
        }
        const hashedPassword = await bcrypt.hash(chrisData.password, 10);
        chrisUser = new User({
          ...chrisData,
          password: hashedPassword,
        });
        await chrisUser.save();
        console.log('Created chrisboydstun@gmail.com user');
      }
    }

    // Insert new users (excluding chrisboydstun@gmail.com if it already exists)
    const createdUsers = await Promise.all(usersData
      .filter(userData => userData.email !== 'chrisboydstun@gmail.com' || !chrisUser)
      .map(async (userData) => {
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

    if (chrisUser) createdUsers.push(chrisUser);

    console.log(`Seeded ${createdUsers.length} users`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase().catch(console.error);
