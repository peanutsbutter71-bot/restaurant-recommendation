import { GoogleGenAI } from '@google/genai';

// Shared Gemini-backed request handlers, used by both the local Express dev
// server (server.ts) and the Vercel serverless functions (api/spots/*.ts),
// so the AI prompt/parsing logic lives in exactly one place.

export interface HandlerResult {
  status: number;
  body: any;
}

export interface LinkCandidate {
  id: string;
  title: string;
  address?: string;
  googleMapsUrl: string;
  tabelogUrl?: string;
  description?: string;
  sourceType: 'ai_grounded' | 'ai_generated' | 'fallback_search';
  confidence: 'high' | 'medium' | 'low';
}

// Extracts the value of a standard Open Graph / meta tag (e.g. og:title,
// og:description, og:image) via a plain regex over the raw HTML. These tags
// are metadata that sites publish specifically so external tools (LINE,
// Twitter, Slack link previews, etc.) can show a preview - reading them is
// not scraping the page's internal structure, just standard, publicly
// intended metadata, so it carries none of the ToS risk that parsing a
// site's actual page markup for e.g. price/reviews would.
function extractMetaTagContent(html: string, property: string): string | undefined {
  const tagMatch = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i'));
  if (!tagMatch) return undefined;
  const contentMatch = tagMatch[0].match(/content=["']([^"']*)["']/i);
  if (!contentMatch) return undefined;
  const decoded = decodeHtmlEntities(contentMatch[1]).trim();
  return decoded || undefined;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Helper: Auto-expand Google Maps short URL and extract the page's title +
// Open Graph metadata (name/description/image), so callers can build a
// useful spot without necessarily needing an AI web-search call at all.
async function fetchStoreMetadataFromUrl(
  rawUrl: string
): Promise<{ title?: string; expandedUrl?: string; ogDescription?: string; ogImage?: string }> {
  try {
    const res = await fetch(rawUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,ja-JP;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    const expandedUrl = res.url || rawUrl;
    const htmlText = await res.text();

    const ogTitle = extractMetaTagContent(htmlText, 'og:title');
    const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = ogTitle || (titleMatch ? titleMatch[1].trim() : undefined);
    if (title) {
      title = title
        .replace(/\s*-\s*Google\s*マップ.*/i, '')
        .replace(/\s*-\s*Google\s*Maps.*/i, '')
        .replace(/\s*[-|｜]\s*食べログ.*/i, '')
        .trim();
    }

    const ogDescription = extractMetaTagContent(htmlText, 'og:description');
    const ogImage = extractMetaTagContent(htmlText, 'og:image');

    return { title, expandedUrl, ogDescription, ogImage };
  } catch (e) {
    return { expandedUrl: rawUrl };
  }
}

// Simple In-Memory LRU-ish Cache for AI URL Parsing (0 API cost for duplicate URLs).
// Same caveat as rateLimit.ts: per-warm-instance only on Vercel, not a durable cache.
const urlParseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function handleParseShareUrl(body: any): Promise<HandlerResult> {
  const { rawInput, title, text, url } = body || {};

  const inputContent = [rawInput, url, text, title]
    .filter((s) => s && typeof s === 'string' && s.trim().length > 0)
    .join('\n')
    .trim();

  if (!inputContent) {
    return { status: 400, body: { error: 'URLまたはテキストを入力してください' } };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  const urlMatch = inputContent.match(/https?:\/\/[^\s]+/i);
  const extractedUrl = urlMatch ? urlMatch[0] : '';
  const isGoogleMaps = extractedUrl.includes('google.com/maps') || extractedUrl.includes('maps.app.goo.gl');
  const isTabelog = extractedUrl.includes('tabelog.com');

  let fetchedTitle = '';
  let ogDescription = '';
  let ogImage = '';
  let expandedUrl = extractedUrl;
  if (extractedUrl && (isGoogleMaps || isTabelog)) {
    try {
      const metadata = await fetchStoreMetadataFromUrl(extractedUrl);
      if (metadata.title) fetchedTitle = metadata.title;
      if (metadata.expandedUrl) expandedUrl = metadata.expandedUrl;
      if (metadata.ogDescription) ogDescription = metadata.ogDescription;
      if (metadata.ogImage) ogImage = metadata.ogImage;
    } catch (e) {
      console.warn('Metadata fetch failed:', e);
    }
  }

  const cacheKey = (extractedUrl || inputContent).trim();
  if (cacheKey && urlParseCache.has(cacheKey)) {
    const cached = urlParseCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log('⚡ Serving AI parse result from server cache for:', cacheKey);
      return { status: 200, body: cached.data };
    }
    urlParseCache.delete(cacheKey);
  }

  const sourceLabel = isTabelog ? '食べログ共有' : isGoogleMaps ? 'Googleマップ共有' : '共有リンク';

  function buildOgpOnlyFallback(): HandlerResult {
    let fallbackArea = '表参道';
    if (fetchedTitle) {
      const areaMatches = ['表参道', '渋谷', '新宿', '恵比寿', '中目黒', '銀座', '池袋', '六本木', '高田馬場', '下北沢', '横浜', '京都', '大阪', '鎌倉', '福岡', '札幌', '沖縄'];
      const matched = areaMatches.find((a) => fetchedTitle.includes(a));
      if (matched) fallbackArea = matched;
    }

    return {
      status: 200,
      body: {
        spot: {
          name: fetchedTitle || title || '気になるお店',
          area: fallbackArea,
          genres: ['カフェ・喫茶'],
          scenes: ['友達・同僚と'],
          priceRange: '1000〜3000円',
          recommender: sourceLabel,
          comment: ogDescription ? ogDescription.slice(0, 150) : `共有リンクから追加: ${inputContent.slice(0, 100)}`,
          mapUrl: isGoogleMaps ? expandedUrl : undefined,
          tabelogUrl: isTabelog ? expandedUrl : undefined,
          imageUrl: ogImage || undefined,
        },
        sourceUrl: expandedUrl,
        isAiParsed: !!fetchedTitle,
        message: fetchedTitle ? '✨ 店舗名を自動取得しました！' : '基本情報のみ抽出しました。必要に応じて補正してください。',
      },
    };
  }

  if (!apiKey) {
    return buildOgpOnlyFallback();
  }

  // Tier 1: we already have the real page's title (and often a description)
  // via Open Graph tags fetched above with a plain HTTP request - no Gemini
  // needed for that part. Ask Gemini only to classify genre/area/scenes/price
  // from this already-known real content, WITHOUT the googleSearch tool,
  // since there's nothing left to search for. This avoids the separately
  // (and more strictly) rate-limited search-grounding quota entirely for the
  // common case of a single resolved Tabelog/Google Maps place page.
  if (fetchedTitle) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const classifyPrompt = `あなたは日本のグルメジャンル分類の専門家です。
以下は実際に取得した店舗ページの情報です。Web検索は不要です。この内容だけをもとに、飲食店登録用の分類情報をJSON形式で出力してください。

【店舗ページ情報】
店名: ${fetchedTitle}
${ogDescription ? `説明文: ${ogDescription}\n` : ''}参考URL: ${expandedUrl}

【分類ルール】
- エリア・最寄り駅 (area): 説明文や店名から読み取れる代表的なエリア・駅名(2〜6文字程度)。読み取れなければ "都内" としてください。
- ジャンル (genres): ["カフェ", "居酒屋", "イタリアン", "ラーメン", "韓国料理", "スイーツ", "ビストロ", "焼肉", "和食", "中華"] の中から1〜3個
- シーン (scenes): ["デート", "女子会", "飲み会", "一人飯", "接待", "記念日"] の中から1〜3個
- 価格帯 (priceRange): "〜1000円", "1000〜3000円", "3000〜5000円", "5000円〜" の中から必ず1つ
- コメント (comment): 説明文の内容を2文程度で日本語にまとめてください（説明文が無ければ店名から推測できる範囲で簡潔に）

以下のJSON形式のみを出力してください:
{
  "area": "エリア名",
  "genres": ["ジャンル1"],
  "scenes": ["シーン1"],
  "priceRange": "1000〜3000円",
  "comment": "まとめコメント"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: classifyPrompt,
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
        console.warn('JSON parsing failed from OGP-classification response:', e);
      }

      const spot = {
        name: fetchedTitle,
        area: parsedResult.area || '都内',
        genres: Array.isArray(parsedResult.genres) && parsedResult.genres.length > 0 ? parsedResult.genres : ['カフェ・喫茶'],
        scenes: Array.isArray(parsedResult.scenes) && parsedResult.scenes.length > 0 ? parsedResult.scenes : ['友達・同僚と'],
        priceRange: parsedResult.priceRange || '1000〜3000円',
        recommender: sourceLabel,
        comment: parsedResult.comment || (ogDescription ? ogDescription.slice(0, 150) : `共有リンクから追加: ${inputContent.slice(0, 100)}`),
        mapUrl: isGoogleMaps ? expandedUrl : undefined,
        tabelogUrl: isTabelog ? expandedUrl : undefined,
        imageUrl: ogImage || undefined,
      };

      const responseData = {
        spot,
        sourceUrl: expandedUrl,
        isAiParsed: true,
        message: '✨ ページ情報から店舗情報を取得しました！',
      };

      if (cacheKey) {
        urlParseCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
      }

      return { status: 200, body: responseData };
    } catch (err) {
      // Don't escalate to the full search-grounded call below - that would
      // spend the scarcer search quota as a retry. We already have a real
      // title/description/image from OGP, so just use those directly.
      console.warn('OGP-based classification failed, returning OGP-only result:', err);
      return buildOgpOnlyFallback();
    }
  }

  // Tier 2: no usable title could be fetched directly (e.g. a Google Maps
  // "saved list" share URL, or plain shared text with no fetchable page) -
  // fall back to asking Gemini to search the web itself, which can also
  // enumerate multiple stores from a list-style share.
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = `あなたは日本のグルメ情報・飲食店データ抽出のスペシャリストです。
ユーザーから共有された以下のURLまたはテキストを解析し、Google検索ツールを用いて店舗の正確な情報を検索・補完して、飲食店登録用のJSONデータを生成してください。

【ユーザーからの共有テキスト / URL】
"""
${inputContent}
"""

【重要な指示】
1. もし入力URLが「Googleマップの保存リスト・再生リスト共有URL」（例: maps.app.goo.gl のリストリンク）や、複数の店舗URL・店舗名が含まれるテキストの場合は、含まれる【すべての飲食店】（最大20軒）を抽出してください。
2. 単一の店舗の場合は、1軒のみ抽出してください。
3. 食べログ、Googleマップ、Instagram、公式ページ等の情報から以下を特定・分類してください：
   - 正式店舗名 (name): 例 "CHAVATY 表参道", "挽肉と米 渋谷"
   - エリア・最寄り駅 (area): 例 "表参道", "渋谷", "新宿", "銀座", "横浜", "京都", "大阪" など代表的なエリア・駅名（2〜6文字程度）
   - ジャンル (genres): ["カフェ", "居酒屋", "イタリアン", "ラーメン", "韓国料理", "スイーツ", "ビストロ", "焼肉", "和食", "中華"] の中から1〜3個
   - シーン (scenes): ["デート", "女子会", "飲み会", "一人飯", "接待", "記念日"] の中から1〜3個
   - 価格帯 (priceRange): "〜1000円", "1000〜3000円", "3000〜5000円", "5000円〜" の中から必ず1つ選択
   - コメント・魅力 (comment): 最寄り駅徒歩分数（例「渋谷駅徒歩3分」）や共有テキスト内のメモ、店舗の特徴を2文でまとめる
   - GoogleマップURL (mapUrl): 正確なGoogleマップURL
   - 食べログURL (tabelogUrl): 正確な食べログURL

4. 必ず以下のJSON形式のみを出力してください（複数店舗の場合は "spots" 配列に格納）:
{
  "isList": true,
  "listTitle": "共有リスト",
  "spots": [
    {
      "name": "店舗名",
      "area": "エリア名",
      "genres": ["カフェ", "スイーツ"],
      "scenes": ["デート", "女子会"],
      "priceRange": "1000〜3000円",
      "comment": "渋谷駅徒歩3分。テラス席の雰囲気が最高で女子会に人気。",
      "mapUrl": "https://...",
      "tabelogUrl": "https://..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
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
      console.warn('JSON parsing failed from Gemini share parse response:', e);
    }

    const extractedSpotsArray: any[] = Array.isArray(parsedResult.spots)
      ? parsedResult.spots
      : parsedResult.name
      ? [parsedResult]
      : [];

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webLinks: Array<{ uri: string; title: string }> = [];
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        webLinks.push({ uri: chunk.web.uri, title: chunk.web.title || '' });
      }
    }
    const tabelogGrounding = webLinks.find((l) => l.uri.includes('tabelog.com'));
    const mapsGrounding = webLinks.find(
      (l) => l.uri.includes('google.com/maps') || l.uri.includes('maps.app.goo.gl')
    );

    const formattedSpots = extractedSpotsArray.map((sp) => ({
      name: sp.name || '気になるお店',
      area: sp.area || '都内',
      genres: Array.isArray(sp.genres) && sp.genres.length > 0 ? sp.genres : ['カフェ・喫茶'],
      scenes: Array.isArray(sp.scenes) && sp.scenes.length > 0 ? sp.scenes : ['友達・同僚と'],
      priceRange: sp.priceRange || '1000〜3000円',
      recommender: 'Googleマップ共有',
      comment: sp.comment || 'Googleマップ共有リストから追加',
      mapUrl: sp.mapUrl || (isGoogleMaps ? extractedUrl : mapsGrounding?.uri),
      tabelogUrl: sp.tabelogUrl || (isTabelog ? extractedUrl : tabelogGrounding?.uri),
      highlightDish: sp.highlightDish || '',
    }));

    const firstSpot = formattedSpots[0] || {
      name: fetchedTitle || title || '気になるお店',
      area: '表参道',
      genres: ['カフェ・喫茶'],
      scenes: ['友達・同僚と'],
      priceRange: '1000〜3000円',
      recommender: '共有リンク',
      comment: `共有リンクから追加: ${inputContent.slice(0, 100)}`,
      mapUrl: isGoogleMaps ? expandedUrl : undefined,
      tabelogUrl: isTabelog ? expandedUrl : undefined,
    };

    const responseData = {
      spot: firstSpot,
      spots: formattedSpots,
      isList: parsedResult.isList || formattedSpots.length > 1,
      listTitle: parsedResult.listTitle || 'Googleマップ保存リスト',
      sourceUrl: extractedUrl,
      isAiParsed: formattedSpots.length > 0,
      message:
        formattedSpots.length > 1
          ? `✨ Googleマップリストから ${formattedSpots.length}軒 のお店を自動抽出しました！`
          : '✨ AIが店舗情報を解析しました！',
    };

    if (cacheKey && responseData.isAiParsed) {
      urlParseCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    }

    return { status: 200, body: responseData };
  } catch (err: any) {
    console.error('Error during AI share parse:', err);
    return {
      status: 500,
      body: {
        error: 'AIによるURL解析中にエラーが発生しました',
        fallback: {
          name: title || '気になるお店',
          area: '東京',
          mapUrl: isGoogleMaps ? extractedUrl : undefined,
          tabelogUrl: isTabelog ? extractedUrl : undefined,
          comment: `共有情報: ${inputContent.slice(0, 100)}`,
        },
      },
    };
  }
}

export async function handleParseImage(body: any): Promise<HandlerResult> {
  const { imageBase64, mimeType = 'image/jpeg' } = body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return { status: 400, body: { error: '画像データが見つかりません' } };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: 'GEMINI_API_KEYが設定されていません' } };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `あなたは日本のグルメスポット専門AIアシスタントです。
提供された画像は、食べログ、Googleマップ、Instagram、LINEチャット、Twitterなどの店舗スクリーンショット画像です。

画像からテキスト（店名、エリア、住所、ジャンル、メニュー、雰囲気、予算、評価など）を読み取り、以下のJSONフォーマットで出力してください。

【厳格なルール】
1. 店名 (name) は正式名称または最も目立つ名称を正確に抽出してください。
2. エリア (area) は「渋谷」「表参道」「新宿」「高田馬場」「恵比寿」などの最寄り駅・地域名を1つ抽出してください。
3. ジャンル (genres) は ["カフェ", "ビストロ"] などの配列形式で指定してください。
4. 価格帯 (priceRange) は "〜1000円", "1000〜3000円", "3000〜5000円", "5000円〜" の4つのいずれかから最も近いものを選んでください。
5. コメント (comment) には、画像に載っている特徴や魅力（「雰囲気がオシャレ」「プリンが人気」など）を2文程度でまとめてください。
6. 返答は余計な解説を含めず、純粋なJSONのみを出力してください。

JSON構造例:
{
  "name": "店舗名",
  "area": "渋谷",
  "genres": ["カフェ", "スイーツ"],
  "scenes": ["デート", "女子会"],
  "priceRange": "1000〜3000円",
  "comment": "画像から抽出したお店の特徴メモ"
}`;

    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt },
        ],
      },
    ];

    // Note: no googleSearch tool here - this is pure vision/OCR extraction from
    // the screenshot itself, so real-time web search grounding isn't needed.
    // Dropping it removes this endpoint entirely from the (separately and more
    // strictly rate-limited) search-grounding quota.
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
    });

    const responseText = response.text || '';
    let jsonString = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(jsonString);
    } catch (e) {
      console.warn('Failed to parse JSON from Vision response:', responseText);
    }

    const spot = {
      name: parsedResult.name || '画像から抽出したお店',
      area: parsedResult.area || '都内',
      genres: Array.isArray(parsedResult.genres) && parsedResult.genres.length > 0 ? parsedResult.genres : ['カフェ・喫茶'],
      scenes: Array.isArray(parsedResult.scenes) && parsedResult.scenes.length > 0 ? parsedResult.scenes : ['友達・同僚と'],
      priceRange: parsedResult.priceRange || '1000〜3000円',
      recommender: 'スクショ画像共有',
      comment: parsedResult.comment || '画像スクショからAI自動抽出',
    };

    return { status: 200, body: { spot, message: '✨ 画像から店舗情報をAI解析しました！' } };
  } catch (err: any) {
    console.error('Error during Vision AI share parse:', err);
    return { status: 500, body: { error: '画像解析中にエラーが発生しました' } };
  }
}

export async function handleCheckStatus(body: any): Promise<HandlerResult> {
  const { name, area, mapUrl, tabelogUrl } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { status: 400, body: { error: '店名を入力してください' } };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 200,
      body: {
        operatingStatus: 'open',
        statusCheckNote: 'APIキー未設定のため自動チェックをスキップしました',
        checkedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
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
      config: { tools: [{ googleSearch: {} }] },
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
      parsedResult = { operatingStatus: 'unknown', statusCheckNote: '情報取得結果の解析に失敗しました' };
    }

    return {
      status: 200,
      body: {
        operatingStatus: parsedResult.operatingStatus || 'open',
        statusCheckNote: parsedResult.statusCheckNote || '最新の営業状況を確認しました',
        confidence: parsedResult.confidence || 'medium',
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('Error in store status check:', err);
    return {
      status: 500,
      body: {
        error: '店舗営業状態の確認中にエラーが発生しました',
        operatingStatus: 'unknown',
        statusCheckNote: '通信エラーのため判定できませんでした',
        checkedAt: new Date().toISOString(),
      },
    };
  }
}

export async function handleSearchLinks(body: any): Promise<HandlerResult> {
  const { name, area } = body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { status: 400, body: { error: '店名（店舗名）を入力してください' } };
  }

  const shopName = name.trim();
  const shopArea = (area || '').trim();
  const fallbackQuery = `${shopName} ${shopArea}`.trim();

  const fallbackGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
  const fallbackTabelogUrl = `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(fallbackQuery)}`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
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
    return { status: 200, body: { candidates, isAiGrounded: false, message: '直接検索用のリンクを生成しました' } };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
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
      config: { tools: [{ googleSearch: {} }] },
    });

    const responseText = response.text || '';

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webLinks: Array<{ uri: string; title: string }> = [];
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        webLinks.push({ uri: chunk.web.uri, title: chunk.web.title || '' });
      }
    }

    const tabelogGrounding = webLinks.find((l) => l.uri.includes('tabelog.com'));
    const mapsGrounding = webLinks.find(
      (l) => l.uri.includes('google.com/maps') || l.uri.includes('maps.app.goo.gl')
    );

    let parsedCandidates: LinkCandidate[] = [];

    try {
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

    return {
      status: 200,
      body: { candidates: parsedCandidates, isAiGrounded: true, groundingSourcesCount: webLinks.length },
    };
  } catch (err: any) {
    console.error('Error during AI link search:', err);

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

    return {
      status: 200,
      body: {
        candidates: fallbackCandidates,
        isAiGrounded: false,
        warning: 'AI検索が一時的に利用できないため、直接検索リンクを生成しました。',
      },
    };
  }
}
