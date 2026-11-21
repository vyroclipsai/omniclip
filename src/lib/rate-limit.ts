interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitRecord>();

/**
 * Lightweight token bucket rate limiter for Next.js API routes.
 * Default: 60 requests per 60 seconds per IP.
 */
export function rateLimit(
  req: Request,
  limit: number = 60,
  windowMs: number = 60_000
): { success: boolean; remaining: number; reset: number } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  const now = Date.now();
  const record = ipMap.get(ip);

  // Periodic cleanup
  if (ipMap.size > 10_000) {
    for (const [k, v] of ipMap.entries()) {
      if (v.resetAt < now) ipMap.delete(k);
    }
  }

  if (!record || record.resetAt < now) {
    ipMap.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, reset: record.resetAt };
}
