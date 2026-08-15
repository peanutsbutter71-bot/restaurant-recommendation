import { RestaurantSpot } from '../types';

export interface ParseShareResponse {
  spot: Partial<RestaurantSpot>;
  sourceUrl?: string;
  isAiParsed: boolean;
  groundingSourcesCount?: number;
  message?: string;
  error?: string;
}

export async function parseSharedUrlOrText(
  rawInput: string,
  extraParams?: { title?: string; text?: string; url?: string }
): Promise<ParseShareResponse> {
  const trimmed = rawInput.trim();

  if (!trimmed && !extraParams?.url && !extraParams?.text && !extraParams?.title) {
    throw new Error('解析するURLまたはテキストを入力してください');
  }

  try {
    const response = await fetch('/api/spots/parse-share-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawInput: trimmed,
        title: extraParams?.title,
        text: extraParams?.text,
        url: extraParams?.url,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'URLの解析に失敗しました');
    }

    return data;
  } catch (err: any) {
    console.warn('API parse failed, returning client fallback:', err);
    // Fallback extraction
    const urlMatch = (trimmed + ' ' + (extraParams?.url || '')).match(/https?:\/\/[^\s]+/i);
    const extractedUrl = urlMatch ? urlMatch[0] : '';
    const isGoogleMaps = extractedUrl.includes('google.com/maps') || extractedUrl.includes('maps.app.goo.gl');
    const isTabelog = extractedUrl.includes('tabelog.com');

    return {
      spot: {
        name: extraParams?.title || '共有から追加したお店',
        area: '表参道',
        genres: ['カフェ'],
        scenes: ['女子会'],
        priceRange: '1000〜3000円',
        recommender: '共有リンク',
        comment: `共有リンクから追加: ${trimmed.slice(0, 100)}`,
        mapUrl: isGoogleMaps ? extractedUrl : undefined,
        tabelogUrl: isTabelog ? extractedUrl : undefined,
      },
      sourceUrl: extractedUrl,
      isAiParsed: false,
      message: '通信環境またはキー未設定のため、基本情報のみ反映しました',
    };
  }
}

/**
 * Check if the current page was opened via Web Share Target query params
 * e.g. /?title=...&text=...&url=... or /?import_url=...
 */
export function extractShareTargetParamsFromUrl(): {
  hasShareData: boolean;
  title?: string;
  text?: string;
  url?: string;
  combined: string;
} {
  if (typeof window === 'undefined') {
    return { hasShareData: false, combined: '' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const title = searchParams.get('title') || '';
  const text = searchParams.get('text') || '';
  const url = searchParams.get('url') || searchParams.get('import_url') || '';

  const combined = [url, text, title].filter(Boolean).join('\n').trim();
  const hasShareData = combined.length > 0;

  return {
    hasShareData,
    title: title || undefined,
    text: text || undefined,
    url: url || undefined,
    combined,
  };
}

/**
 * Clear share query params from URL without refreshing the page
 */
export function clearShareParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('title');
  url.searchParams.delete('text');
  url.searchParams.delete('url');
  url.searchParams.delete('import_url');
  window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
}
