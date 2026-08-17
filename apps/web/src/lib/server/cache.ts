import "server-only";

/**
 * Two guarantees for the server-side reads behind the public pages.
 *
 * **A deadline.** `neon()` retries a failed connection, so an unreachable
 * database does not throw — it hangs, past Next's 60-second per-page budget,
 * and takes the build or the request down with it. Every read here is racing a
 * timer, and losing the race means an empty result rather than a stalled page.
 *
 * **A short memo.** These pages are rendered per request, and the landing page
 * asks three questions of the database that change hourly at most. Fluid
 * Compute reuses instances, so an in-process TTL cache absorbs almost all of
 * that; a cold instance simply pays for one query.
 */

const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_TTL_MS = 60_000;

export async function withTimeout<T>(
  work: () => Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      work(),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          console.error(`${label}: timed out after ${timeoutMs}ms`);
          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    console.error(`${label}:`, error);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const entries = new Map<string, { value: unknown; expiresAt: number }>();

/**
 * Caches the resolved value, not the promise: a failed read that resolved to
 * its fallback should be retried on the next request rather than pinned for
 * the whole TTL.
 */
export async function cached<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
  work: () => Promise<T>,
): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await work();
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
