// jest.config.js

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  // Add these lines
  testTimeout: 45000, // 30 seconds
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
