/**
 * Minimal in-memory sliding-window rate limiter.
 * Upstash-ready interface: swap store for Redis without changing callers.
 */

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    hits.set(key, timestamps);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true, retryAfter: 0 };
}

export function clearRateLimitStore(): void {
  hits.clear();
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}
