export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

declare global {
  var __cpaRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

function buckets(): Map<string, RateLimitBucket> {
  globalThis.__cpaRateLimitBuckets ??= new Map<string, RateLimitBucket>();
  return globalThis.__cpaRateLimitBuckets;
}

export function checkRateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const now = args.nowMs ?? Date.now();
  const store = buckets();
  const current = store.get(args.key);

  if (!current || current.resetAt <= now) {
    store.set(args.key, { count: 1, resetAt: now + args.windowMs });
    return { allowed: true, remaining: Math.max(0, args.limit - 1), retryAfterSec: 0 };
  }

  if (current.count >= args.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(args.key, current);
  return {
    allowed: true,
    remaining: Math.max(0, args.limit - current.count),
    retryAfterSec: 0,
  };
}

export function resetRateLimitsForTests(): void {
  globalThis.__cpaRateLimitBuckets?.clear();
}
