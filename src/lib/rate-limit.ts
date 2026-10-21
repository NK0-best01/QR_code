import { NextRequest } from 'next/server';

export interface RateLimitOptions {
  limit?: number; // max requests allowed per window
  windowMs?: number; // window duration in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when the current window resets
  retryAfter: number; // Seconds to wait before retrying (0 if success)
}

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory store: Map<identifier, RateLimitRecord>
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredRecords(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    const validTimestamps = record.timestamps.filter((t) => now - t < windowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

/**
 * Checks if the request from the given identifier exceeds the rate limit.
 * Uses a sliding window algorithm.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 30; // default 30 requests per minute
  const windowMs = options.windowMs ?? 60_000; // default 1 minute
  const now = Date.now();

  cleanupExpiredRecords(windowMs);

  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  const reset = Math.ceil((now + windowMs) / 1000);

  if (record.timestamps.length >= limit) {
    // Exceeded limit
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    );

    return {
      success: false,
      limit,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  // Under limit: record current request
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    success: true,
    limit,
    remaining,
    reset,
    retryAfter: 0,
  };
}

/**
 * Resets the in-memory store. Useful in unit/integration tests.
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
  lastCleanup = Date.now();
}

/**
 * Extracts a client identifier (IP address) from request headers.
 */
export function getClientIdentifier(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can be a comma-separated list of IPs: "client, proxy1, proxy2"
    const clientIp = xForwardedFor.split(',')[0].trim();
    if (clientIp) return clientIp;
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return '127.0.0.1';
}
