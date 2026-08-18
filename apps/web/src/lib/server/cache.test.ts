import { describe, expect, it, vi } from "vitest";
import { cached, withTimeout } from "./cache";

/**
 * These two functions are what stand between a Neon blink and a hung render.
 * `neon()` retries a failed connection rather than throwing, so an unreachable
 * database does not error — it hangs, past Next's per-page budget. That is what
 * broke the first production build of the practice pages.
 */
describe("withTimeout", () => {
  it("returns the work's result when it finishes in time", async () => {
    const result = await withTimeout(async () => "done", "fallback", "test");
    expect(result).toBe("done");
  });

  it("falls back rather than hanging when the work never settles", async () => {
    vi.useFakeTimers();
    try {
      const pending = withTimeout(
        () => new Promise<string>(() => {}), // never resolves, like a retrying driver
        "fallback",
        "test",
        50,
      );
      await vi.advanceTimersByTimeAsync(60);
      expect(await pending).toBe("fallback");
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back when the work throws", async () => {
    const result = await withTimeout(
      async () => {
        throw new Error("connection refused");
      },
      "fallback",
      "test",
    );
    expect(result).toBe("fallback");
  });

  /**
   * The timer has to be cleared on the happy path. A pending timeout keeps the
   * process alive and, in a serverless function, keeps the instance billable.
   */
  it("clears its timer once the work resolves", async () => {
    const clear = vi.spyOn(globalThis, "clearTimeout");
    await withTimeout(async () => "done", "fallback", "test");
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});

describe("cached", () => {
  it("runs the work once within the TTL", async () => {
    const work = vi.fn(async () => "value");
    await cached("k1", 10_000, work);
    await cached("k1", 10_000, work);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("re-runs once the TTL has passed", async () => {
    const work = vi.fn(async () => "value");
    await cached("k2", 1, work);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await cached("k2", 1, work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("keys entries separately", async () => {
    const work = vi.fn(async () => "value");
    await cached("k3", 10_000, work);
    await cached("k4", 10_000, work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  /**
   * It caches the resolved value, not the promise. A read that failed and fell
   * back to an empty result should be retried on the next request rather than
   * pinned as the answer for the whole TTL — otherwise one blink empties the
   * practice pages for a minute.
   */
  it("does not pin a fallback result for the whole TTL", async () => {
    let attempt = 0;
    const work = vi.fn(async () => {
      attempt += 1;
      return attempt === 1 ? [] : ["Regulations"];
    });

    expect(await cached("k5", 1, work)).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await cached("k5", 1, work)).toEqual(["Regulations"]);
  });
});
