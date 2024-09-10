import mongoose from "mongoose";
import Question from "./models/Question";
import * as dotenv from "dotenv";

dotenv.config();

const migrationScript = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("Connected to MongoDB");

    const result = await Question.updateMany(
      { prompt: { $exists: false } },
      { $set: { prompt: "Please read the following question carefully:" } }
    );

    console.log(`Updated ${result.modifiedCount} questions`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

migrationScript();
