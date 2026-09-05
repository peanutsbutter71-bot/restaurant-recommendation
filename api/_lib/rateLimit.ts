// Best-effort in-memory rate limiting to prevent Gemini API quota abuse.
//
// NOTE: On Vercel, each serverless function file gets its own isolated
// runtime, and a cold start resets this Map. This means the limit is not
// globally enforced across all instances/regions - it's a best-effort
// per-warm-instance guard, not a hard cap. That's an acceptable tradeoff
// for a small friend-group app; a durable limiter would require an external
// store (e.g. Redis) which isn't worth the added infra for this scale.

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 30; // Max 30 requests per minute per IP

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(clientIp: string): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true };
}

export function getClientIp(headers: {
  [key: string]: string | string[] | undefined;
}, socketAddress?: string): string {
  const forwarded = headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return forwardedIp?.split(',')[0].trim() || socketAddress || 'unknown-ip';
}
