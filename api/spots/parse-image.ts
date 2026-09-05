import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getClientIp } from '../_lib/rateLimit.js';
import { handleParseImage } from '../_lib/spotHandlers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientIp = getClientIp(req.headers, req.socket?.remoteAddress);
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    return res.status(429).json({
      error: `AI解析の利用上限（1分間に30回）に達しました。${rateLimit.retryAfterSeconds}秒後に再度お試しください。`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const result = await handleParseImage(req.body);
  return res.status(result.status).json(result.body);
}
