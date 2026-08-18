import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias in tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),

      // `server-only` throws on import outside a Server Component, and the
      // test environment is jsdom — so the modules that import it as a guard
      // (src/lib/server/*) would be untestable rather than merely server-side.
      // Aliasing it to an empty module keeps the guard in the real build and
      // lets the tests reach the code it protects.
      "server-only": fileURLToPath(
        new URL("./src/test-utils/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
