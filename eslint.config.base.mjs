import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Shared config for the server-side packages. apps/web keeps its own config
 * because eslint-config-next brings its own React/Next rule set.
 */
export default [
  {
    ignores: ["dist/**", "drizzle/**", "src/generated/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        Request: "readonly",
        Response: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
