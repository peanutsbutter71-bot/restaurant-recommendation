import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { checkRateLimit, getClientIp } from './api/_lib/rateLimit';
import {
  handleParseShareUrl,
  handleParseImage,
  handleCheckStatus,
  handleSearchLinks,
} from './api/_lib/spotHandlers';

dotenv.config();

// This Express server is only used for local development (npm run dev /
// npm start). In production, Vercel serves the equivalent logic via the
// serverless functions under api/spots/*.ts, which share the exact same
// handler implementations from api/_lib/spotHandlers.ts - so there is only
// one place to update the AI prompt/parsing logic.
function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp = getClientIp(req.headers, req.socket.remoteAddress);
  const result = checkRateLimit(clientIp);
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    return res.status(429).json({
      error: `AI解析の利用上限（1分間に30回）に達しました。${result.retryAfterSeconds}秒後に再度お試しください。`,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
  return next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Parse Shared URL/Text API endpoint (Web Share Target & Quick URL Import & Bulk Import)
  app.post('/api/spots/parse-share-url', apiRateLimiter, async (req, res) => {
    const result = await handleParseShareUrl(req.body);
    return res.status(result.status).json(result.body);
  });

  // Parse Shared Screenshot Image API Endpoint (画像スクショAI自動解析)
  app.post('/api/spots/parse-image', apiRateLimiter, async (req, res) => {
    const result = await handleParseImage(req.body);
    return res.status(result.status).json(result.body);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Store Status Check API endpoint (営業・閉店・移転確認)
  app.post('/api/spots/check-status', async (req, res) => {
    const result = await handleCheckStatus(req.body);
    return res.status(result.status).json(result.body);
  });

  // AI Link Search API endpoint
  app.post('/api/spots/search-links', async (req, res) => {
    const result = await handleSearchLinks(req.body);
    return res.status(result.status).json(result.body);
  });

  // Note: shared spot data now syncs via the browser talking directly to
  // Firestore (src/utils/firebaseClient.ts) instead of this server, since
  // Vercel's static deployment can't reach this Express process in
  // production. The old in-memory /api/group/* endpoints were removed
  // because nothing calls them anymore.

  // Vite middleware setup for SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
