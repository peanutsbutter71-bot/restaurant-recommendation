import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSearchLinks } from '../_lib/spotHandlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const result = await handleSearchLinks(req.body);
  return res.status(result.status).json(result.body);
}
