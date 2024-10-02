// config/database.ts

import mongoose from "mongoose";
import { logger } from "../utils/logger";
import * as dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error("MONGO_URI is not defined in the environment variables");
    process.exit(1); // Exit the process with an error code
  }

  try {
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error });
    process.exit(1); // Exit the process with an error code
  }
};