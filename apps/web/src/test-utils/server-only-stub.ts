/**
 * Stands in for the `server-only` package under vitest.
 *
 * The real package throws on import from anywhere that is not a Server
 * Component, which is the point of it — but the test environment is jsdom, so
 * without this alias every module guarded by it is untestable. The guard still
 * applies in the real build; only the test run substitutes this.
 *
 * Wired up in vitest.config.mts.
 */
export {};
