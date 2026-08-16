import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { dedupe: ["graphql"] },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    server: {
      deps: {
        inline: [
          /graphql-yoga/,
          /@envelop\//,
          /@graphql-tools\//,
          /@graphql-yoga\//,
        ],
      },
    },
  },
});
