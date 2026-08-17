/**
 * A fixed-window rate limiter for the handful of operations anyone can reach
 * without a token.
 *
 * Why it exists: `register` and `login` each run a bcrypt cost-10 hash, and
 * both are unauthenticated. On a metered platform that is a bill as much as an
 * abuse problem, and `gradeAnswers` is now public too. `turbo.json` has
 * declared UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN since the
 * rewrite with nothing reading them; this is what reads them.
 *
 * Upstash is spoken to over its REST API with plain fetch rather than the SDK.
 * The whole protocol needed here is one INCR and one EXPIRE, and adding a
 * dependency to send two commands is a poor trade.
 *
 * With no Upstash configured it falls back to an in-process counter. That is
 * genuinely weaker — Fluid Compute reuses instances but does not guarantee one,
 * so a determined caller spread across instances gets a higher effective
 * ceiling. It is still the difference between a typo loop and an unbounded one,
 * and it keeps local development and the test suite free of a network
 * dependency.
 */

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the current window rolls over. */
  retryAfter: number;
}

/**
 * Bcrypt-backed and unauthenticated. Ten a minute is far above what a person
 * typing a password does and far below what a script wants.
 */
export const AUTH_RULE: RateLimitRule = { limit: 10, windowSeconds: 60 };

/**
 * Answer submission. A 200-item run fires 200 concurrent mutations by design,
 * so this has to clear a whole run comfortably while still bounding a loop
 * pointed at the leaderboard.
 */
export const SUBMIT_RULE: RateLimitRule = { limit: 600, windowSeconds: 60 };

/** Public and cheap, but it is a database round trip a stranger can trigger. */
export const PUBLIC_RULE: RateLimitRule = { limit: 120, windowSeconds: 60 };

const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

/** Bounds the fallback map: without this a spray of unique IPs is a slow leak. */
const MAX_MEMORY_KEYS = 10_000;

function checkInMemory(key: string, rule: RateLimitRule): RateLimitDecision {
  const now = Date.now();
  const existing = memoryCounters.get(key);

  if (!existing || existing.expiresAt <= now) {
    if (memoryCounters.size >= MAX_MEMORY_KEYS) {
      for (const [candidate, entry] of memoryCounters) {
        if (entry.expiresAt <= now) memoryCounters.delete(candidate);
      }
      // Still full of live windows: drop the oldest insertion rather than grow.
      if (memoryCounters.size >= MAX_MEMORY_KEYS) {
        const oldest = memoryCounters.keys().next();
        if (!oldest.done) memoryCounters.delete(oldest.value);
      }
    }
    memoryCounters.set(key, {
      count: 1,
      expiresAt: now + rule.windowSeconds * 1000,
    });
    return { allowed: true, retryAfter: rule.windowSeconds };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
  return { allowed: existing.count <= rule.limit, retryAfter };
}

async function checkUpstash(
  key: string,
  rule: RateLimitRule,
  url: string,
  token: string,
): Promise<RateLimitDecision> {
  // One pipelined call: INCR, then EXPIRE with NX so the window is set by the
  // request that opened it and not extended by every request inside it.
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSeconds), "NX"],
    ]),
  });

  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);

  const body = (await response.json()) as { result?: number }[];
  const count = Number(body[0]?.result ?? 0);

  return {
    allowed: count <= rule.limit,
    retryAfter: rule.windowSeconds,
  };
}

/**
 * Never throws and never blocks on a limiter failure: if Upstash is
 * unreachable the request is allowed through. A rate limiter that takes the
 * API down with it when the counter store blinks is worse than the abuse it
 * prevents.
 */
export async function checkRateLimit(
  scope: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  const key = `ratelimit:${scope}:${identifier}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await checkUpstash(key, rule, url, token);
    } catch {
      return checkInMemory(key, rule);
    }
  }

  return checkInMemory(key, rule);
}

/** Test seam: the in-process counters outlive a single test otherwise. */
export function resetRateLimits(): void {
  memoryCounters.clear();
}
