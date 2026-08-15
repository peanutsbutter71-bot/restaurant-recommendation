import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

interface LinkCandidate {
  id: string;
  title: string;
  address?: string;
  googleMapsUrl: string;
  tabelogUrl?: string;
  description?: string;
  sourceType: 'ai_grounded' | 'ai_generated' | 'fallback_search';
  confidence: 'high' | 'medium' | 'low';
}

// In-memory rate limiting configuration to prevent Gemini API quota abuse
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown-ip';

  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 1 minute window
  const MAX_REQUESTS = 30; // Max 30 requests per minute per IP

  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: `AI解析の利用上限（1分間に30回）に達しました。${retryAfterSec}秒後に再度お試しください。`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  record.count += 1;
  return next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Parse Shared URL/Text API endpoint (Web Share Target & Quick URL Import & Bulk Import)
  app.post('/api/spots/parse-share-url', apiRateLimiter, async (req, res) => {
    const { rawInput, title, text, url } = req.body;

    // Combine any shared components
    const inputContent = [rawInput, url, text, title]
      .filter((s) => s && typeof s === 'string' && s.trim().length > 0)
      .join('\n')
      .trim();

    if (!inputContent) {
      return res.status(400).json({
        error: 'URLまたはテキストを入力してください',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Extract basic URL if present
    const urlMatch = inputContent.match(/https?:\/\/[^\s]+/i);
    const extractedUrl = urlMatch ? urlMatch[0] : '';
    const isGoogleMaps = extractedUrl.includes('google.com/maps') || extractedUrl.includes('maps.app.goo.gl');
    const isTabelog = extractedUrl.includes('tabelog.com');
    const isInstagram = extractedUrl.includes('instagram.com');

    if (!apiKey) {
      // Fallback extraction without Gemini API
      let fallbackName = title || '気になるお店';
      let fallbackArea = '東京';
      if (inputContent) {
        const firstLine = inputContent.split('\n')[0].replace(/https?:\/\/[^\s]+/g, '').trim();
        if (firstLine.length > 0 && firstLine.length < 30) {
          fallbackName = firstLine;
        }
      }

      return res.json({
        spot: {
          name: fallbackName,
          area: fallbackArea,
          genres: ['カフェ・喫茶'],
          scenes: ['友達・同僚と'],
          priceRange: '¥1,000〜¥2,000',
          recommender: '共有リンク',
          comment: `共有リンクから追加: ${inputContent.slice(0, 100)}`,
          mapUrl: isGoogleMaps ? extractedUrl : undefined,
          tabelogUrl: isTabelog ? extractedUrl : undefined,
          highlightDish: '',
        },
        sourceUrl: extractedUrl,
        isAiParsed: false,
        message: '基本情報のみ抽出しました。必要に応じて補正してください。',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `あなたは日本のグルメ情報・飲食店データ抽出のスペシャリストです。
ユーザーから共有された以下のURLまたはテキストを解析し、Google検索ツールを用いて店舗の正確な情報を検索・補完して、飲食店登録用のJSONデータを生成してください。

【ユーザーからの共有テキスト / URL】
"""
${inputContent}
"""

【指示】
1. URLやテキストから対象の店舗（レストラン、カフェ、居酒屋、ラーメン屋、スイーツ店など）を特定してください。
2. 食べログ、Googleマップ、Instagram、公式ページ等の情報から以下を特定・分類してください：
   - 正式店舗名 (name): 例 "CHAVATY 表参道", "挽肉と米 渋谷"
   - エリア・最寄り駅 (area): 例 "表参道", "渋谷", "新宿", "銀座", "横浜" など代表的なエリア・駅名（2〜6文字程度）
   - ジャンル (genres): ["カフェ・喫茶", "イタリアン・パスタ", "和食・定食", "焼肉・肉料理", "寿司・海鮮", "ラーメン・麺類", "居酒屋・バル", "中華・アジア", "スイーツ・パン", "フレンチ・ビストロ", "カレー", "洋食"] の中から1〜3個
   - シーン (scenes): ["デート・記念日", "女子会・カフェ巡り", "友達・同僚と", "一人でゆったり", "ご褒美・贅沢", "サクッとごはん", "宴会・飲み会"] の中から1〜3個
   - 価格帯 (priceRange): "〜¥1,000", "¥1,000〜¥2,000", "¥2,000〜¥4,000", "¥4,000〜¥8,000", "¥8,000〜¥15,000", "¥15,000〜" の中から最も近い1つ
   - おすすめメニュー・名物 (highlightDish): 代表的な看板メニュー（例: "本日のスコーンセット", "炭火焼きハンバーグ"）
   - コメント・魅力 (comment): 共有テキスト内のメモや、店舗の特徴（例: "SNSで話題の絶品スコーンとティーラテが人気のお店"）
   - GoogleマップURL (mapUrl): 正確なGoogleマップURL
   - 食べログURL (tabelogUrl): 正確な食べログURL

3. 必ず以下のJSON形式のみを出力してください（マークダウンコードブロックや純粋なJSON）:
{
  "name": "店舗名",
  "area": "エリア名",
  "genres": ["ジャンル1", "ジャンル2"],
  "scenes": ["シーン1", "シーン2"],
  "priceRange": "¥1,000〜¥2,000",
  "highlightDish": "名物メニュー",
  "comment": "店舗の特徴やおすすめポイント",
  "mapUrl": "https://...",
  "tabelogUrl": "https://..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || '';
      let parsedSpot: any = {};

      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        parsedSpot = JSON.parse(cleanJson);
      } catch (e) {
        console.warn('JSON parsing failed from Gemini share parse response:', e);
      }

      // Check grounding chunks for direct links
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webLinks: Array<{ uri: string; title: string }> = [];
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          webLinks.push({
            uri: chunk.web.uri,
            title: chunk.web.title || '',
          });
        }
      }
      const tabelogGrounding = webLinks.find((l) => l.uri.includes('tabelog.com'));
      const mapsGrounding = webLinks.find(
        (l) => l.uri.includes('google.com/maps') || l.uri.includes('maps.app.goo.gl')
      );

      const finalMapUrl =
        parsedSpot.mapUrl && parsedSpot.mapUrl.startsWith('http')
          ? parsedSpot.mapUrl
          : isGoogleMaps
          ? extractedUrl
          : mapsGrounding?.uri || undefined;

      const finalTabelogUrl =
        parsedSpot.tabelogUrl && parsedSpot.tabelogUrl.startsWith('http')
          ? parsedSpot.tabelogUrl
          : isTabelog
          ? extractedUrl
          : tabelogGrounding?.uri || undefined;

      const spot = {
        name: parsedSpot.name || title || '店名未設定',
        area: parsedSpot.area || '都内',
        genres: Array.isArray(parsedSpot.genres) && parsedSpot.genres.length > 0
          ? parsedSpot.genres
          : ['カフェ・喫茶'],
        scenes: Array.isArray(parsedSpot.scenes) && parsedSpot.scenes.length > 0
          ? parsedSpot.scenes
          : ['友達・同僚と'],
        priceRange: parsedSpot.priceRange || '¥1,000〜¥2,000',
        recommender: '共有リンク',
        comment: parsedSpot.comment || `共有リンクよりインポート: ${inputContent.slice(0, 80)}`,
        mapUrl: finalMapUrl,
        tabelogUrl: finalTabelogUrl,
        highlightDish: parsedSpot.highlightDish || '',
      };

      return res.json({
        spot,
        sourceUrl: extractedUrl,
        isAiParsed: true,
        groundingSourcesCount: webLinks.length,
      });
    } catch (err: any) {
      console.error('Error during AI share parse:', err);
      return res.status(500).json({
        error: 'AIによるURL解析中にエラーが発生しました',
        fallback: {
          name: title || '気になるお店',
          area: '東京',
          mapUrl: isGoogleMaps ? extractedUrl : undefined,
          tabelogUrl: isTabelog ? extractedUrl : undefined,
          comment: `共有情報: ${inputContent.slice(0, 100)}`,
        },
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Store Status Check API endpoint (営業・閉店・移転確認)
  app.post('/api/spots/check-status', async (req, res) => {
    const { name, area, mapUrl, tabelogUrl } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: '店名を入力してください' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        operatingStatus: 'open',
        statusCheckNote: 'APIキー未設定のため自動チェックをスキップしました',
        checkedAt: new Date().toISOString(),
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `あなたは日本の飲食店情報・営業ステータス調査のアシスタントです。
以下の店舗についてGoogle検索を用いて最新の営業状況（営業中、閉店、休業、移転）を調査し、JSONで出力してください。

店舗名: "${name}"
エリア: "${area || '東京都'}"
参考URL: ${mapUrl || ''} ${tabelogUrl || ''}

【調査基準】
- 食べログやGoogleマップ、公式SNS等で「閉店」「掲載保留」「閉業」「移転」と記載されていないか確認してください。
- 移転している場合は移転先や年月をメモに含めてください。
- 判定結果の operatingStatus は以下から1つ選択:
  - "open" (通常営業中・営業している可能性が高い)
  - "permanently_closed" (閉店・閉業)
  - "temporarily_closed" (一時休業・改装中)
  - "moved" (別場所へ移転)
  - "unknown" (情報不足で判定不能)

【JSON出力フォーマット】
{
  "operatingStatus": "open" | "permanently_closed" | "temporarily_closed" | "moved" | "unknown",
  "statusCheckNote": "判定の理由や最新メモ（例: 2024年現在も通常営業中 / 2023年末に閉店済 / 〇〇へ移転など、30文字程度）",
  "confidence": "high" | "medium" | "low"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || '';
      let parsedResult: any = {};

      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        parsedResult = JSON.parse(cleanJson);
      } catch (e) {
        console.warn('Failed to parse JSON for store status check:', e);
        parsedResult = {
          operatingStatus: 'unknown',
          statusCheckNote: '情報取得結果の解析に失敗しました',
        };
      }

      return res.json({
        operatingStatus: parsedResult.operatingStatus || 'open',
        statusCheckNote: parsedResult.statusCheckNote || '最新の営業状況を確認しました',
        confidence: parsedResult.confidence || 'medium',
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in store status check:', err);
      return res.status(500).json({
        error: '店舗営業状態の確認中にエラーが発生しました',
        operatingStatus: 'unknown',
        statusCheckNote: '通信エラーのため判定できませんでした',
        checkedAt: new Date().toISOString(),
      });
    }
  });

  // AI Link Search API endpoint
  app.post('/api/spots/search-links', async (req, res) => {
    const { name, area } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: '店名（店舗名）を入力してください',
      });
    }

    const shopName = name.trim();
    const shopArea = (area || '').trim();
    const fallbackQuery = `${shopName} ${shopArea}`.trim();

    // Standard fallback query URLs
    const fallbackGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      fallbackQuery
    )}`;
    const fallbackTabelogUrl = `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(
      fallbackQuery
    )}`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return structured fallback links if API key isn't provided
      const candidates: LinkCandidate[] = [
        {
          id: 'fallback-1',
          title: `${shopName}（${shopArea || '指定エリア'}）`,
          googleMapsUrl: fallbackGoogleMapsUrl,
          tabelogUrl: fallbackTabelogUrl,
          description: `「${fallbackQuery}」でGoogleマップおよび食べログを検索するリンクです。`,
          sourceType: 'fallback_search',
          confidence: 'medium',
        },
      ];

      return res.json({
        candidates,
        isAiGrounded: false,
        message: '直接検索用のリンクを生成しました',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `あなたは日本のグルメ情報・店舗検索のスペシャリストです。
以下の飲食店について、WEB上の最新情報をGoogle検索ツールを用いて検索し、正確な「GoogleマップのURL」と「食べログ(tabelog.com)の店舗URL」を特定して候補を提示してください。

【検索対象店舗】
- 店舗名: "${shopName}"
- エリア・最寄駅: "${shopArea || '全国'}"

【指示】
1. この店舗の実在する公式情報、Googleマップ上のページURL、および食べログ(tabelog.com)上の店舗詳細URLを探してください。
2. 食べログURLは "https://tabelog.com/..." 形式の個別店舗ページURL（または検索結果ページURL）を優先してください。
3. GoogleマップURLは "https://www.google.com/maps/..." または "https://maps.app.goo.gl/..." または "https://maps.google.com/?q=..." を提供してください。
4. 候補が複数ある場合やチェーン・複数店舗がヒットした場合は、最も合致する1〜2件を提示してください。
5. 出力は以下のJSON形式のみで回答してください。コードブロックのバッククォートも含めず純粋なJSONオブジェクトを出力するか、jsonブロックで出力してください。

{
  "candidates": [
    {
      "title": "正式な店舗名（例: BISTRO MARCHE 表参道店）",
      "address": "住所または駅徒歩情報（例: 東京都港区北青山3-5-1）",
      "googleMapsUrl": "GoogleマップのURL",
      "tabelogUrl": "食べログの店舗ページURL",
      "description": "店舗の概要・特徴（例: 表参道駅A3出口徒歩2分、開放的なテラス席がある人気ビストロ）",
      "confidence": "high"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || '';

      // Also parse any grounding links from search
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webLinks: Array<{ uri: string; title: string }> = [];
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          webLinks.push({
            uri: chunk.web.uri,
            title: chunk.web.title || '',
          });
        }
      }

      // Find any direct tabelog / maps links in groundingChunks
      const tabelogGrounding = webLinks.find((l) =>
        l.uri.includes('tabelog.com')
      );
      const mapsGrounding = webLinks.find(
        (l) => l.uri.includes('google.com/maps') || l.uri.includes('maps.app.goo.gl')
      );

      let parsedCandidates: LinkCandidate[] = [];

      try {
        // Clean markdown backticks if any
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const data = JSON.parse(cleanJson);
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          parsedCandidates = data.candidates.map((c: any, index: number) => {
            const gMap =
              c.googleMapsUrl && c.googleMapsUrl.startsWith('http')
                ? c.googleMapsUrl
                : mapsGrounding?.uri || fallbackGoogleMapsUrl;

            const tLog =
              c.tabelogUrl && c.tabelogUrl.startsWith('http')
                ? c.tabelogUrl
                : tabelogGrounding?.uri || fallbackTabelogUrl;

            return {
              id: `candidate-${index + 1}`,
              title: c.title || `${shopName} (${shopArea})`,
              address: c.address || undefined,
              googleMapsUrl: gMap,
              tabelogUrl: tLog,
              description: c.description || undefined,
              sourceType: 'ai_grounded',
              confidence: (c.confidence as any) || 'high',
            };
          });
        }
      } catch (parseError) {
        console.warn('JSON parse warning from Gemini response:', parseError);
      }

      // If parsing didn't yield structured candidates, construct from grounding and fallback
      if (parsedCandidates.length === 0) {
        const bestMapsUrl = mapsGrounding?.uri || fallbackGoogleMapsUrl;
        const bestTabelogUrl = tabelogGrounding?.uri || fallbackTabelogUrl;

        parsedCandidates = [
          {
            id: 'candidate-ai-1',
            title: `${shopName}${shopArea ? ` (${shopArea})` : ''}`,
            googleMapsUrl: bestMapsUrl,
            tabelogUrl: bestTabelogUrl,
            description: responseText
              ? responseText.slice(0, 140).replace(/[{}[\]"]/g, '').trim()
              : `AIが検索した「${fallbackQuery}」の店舗リンク情報です。`,
            sourceType: 'ai_generated',
            confidence: 'medium',
          },
        ];
      }

      return res.json({
        candidates: parsedCandidates,
        isAiGrounded: true,
        groundingSourcesCount: webLinks.length,
      });
    } catch (err: any) {
      console.error('Error during AI link search:', err);

      // Graceful fallback with standard search links
      const fallbackCandidates: LinkCandidate[] = [
        {
          id: 'fallback-error',
          title: `${shopName}（${shopArea || 'エリア検索'}）`,
          googleMapsUrl: fallbackGoogleMapsUrl,
          tabelogUrl: fallbackTabelogUrl,
          description: `検索クエリ「${fallbackQuery}」で作成したGoogleマップ・食べログの検索リンクです。`,
          sourceType: 'fallback_search',
          confidence: 'medium',
        },
      ];

      return res.json({
        candidates: fallbackCandidates,
        isAiGrounded: false,
        warning: 'AI検索が一時的に利用できないため、直接検索リンクを生成しました。',
      });
    }
  });

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
