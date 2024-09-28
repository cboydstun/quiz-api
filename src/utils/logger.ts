// src/utils/logger.ts

import winston from "winston";
import expressWinston from "express-winston";
import path from "path";
import fs from "fs";

// Ensure the logs directory exists
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "quiz-api" },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "error.log"), level: "error" }),
    new winston.transports.File({ filename: path.join(logDir, "combined.log") }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export const expressLogger = expressWinston.logger({
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "http.log") }),
  ],
  format: logFormat,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
});

export const errorLogger = expressWinston.errorLogger({
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "error.log") }),
  ],
  format: logFormat,
});