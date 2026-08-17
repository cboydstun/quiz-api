import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { dedupe: ["graphql"] },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    // Every suite stands up its own PGlite instance and replays the real
    // migrations in beforeAll. That is well under a second on a dev machine
    // but can exceed vitest's 10s default on a 2-core CI runner, where the
    // suites contend for cores. Nothing here hangs — it is genuinely slow
    // cold start, so the timeout is raised rather than the isolation given up.
    hookTimeout: 60_000,
    testTimeout: 30_000,
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
