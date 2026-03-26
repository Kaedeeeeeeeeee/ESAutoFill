/**
 * Simple in-memory rate limiter for API routes.
 * In production, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/** Check rate limit. Returns remaining requests, or -1 if exceeded. */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { remaining: -1, resetAt: entry.resetAt };
  }

  return { remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Rate limit presets */
export const RATE_LIMITS = {
  /** AI generation routes: 20 requests per minute */
  ai: { maxRequests: 20, windowMs: 60_000 },
  /** File upload: 10 per minute */
  upload: { maxRequests: 10, windowMs: 60_000 },
  /** General API: 60 per minute */
  general: { maxRequests: 60, windowMs: 60_000 },
} as const;
