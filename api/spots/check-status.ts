import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCheckStatus } from '../_lib/spotHandlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await handleCheckStatus(req.body);
  return res.status(result.status).json(result.body);
}
