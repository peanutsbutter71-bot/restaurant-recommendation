import { LinkCandidate } from '../types';

export interface SearchLinksResponse {
  candidates: LinkCandidate[];
  isAiGrounded?: boolean;
  groundingSourcesCount?: number;
  warning?: string;
  message?: string;
}

export async function searchShopLinks(
  name: string,
  area: string
): Promise<SearchLinksResponse> {
  const trimmedName = name.trim();
  const trimmedArea = area.trim();

  if (!trimmedName) {
    throw new Error('店名を入力してください');
  }

  try {
    const response = await fetch('/api/spots/search-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: trimmedName,
        area: trimmedArea,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `検索エラー (${response.status})`);
    }

    const data: SearchLinksResponse = await response.json();
    return data;
  } catch (error: any) {
    // If backend request fails (e.g. offline or unexpected), construct standard fallback candidate
    console.warn('Backend link search request failed, using client fallback:', error);
    const query = `${trimmedName} ${trimmedArea}`.trim();
    const fallbackGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;
    const fallbackTabelog = `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(
      query
    )}`;

    return {
      candidates: [
        {
          id: 'client-fallback-1',
          title: `${trimmedName}${trimmedArea ? ` (${trimmedArea})` : ''}`,
          googleMapsUrl: fallbackGoogleMaps,
          tabelogUrl: fallbackTabelog,
          description: `「${query}」のGoogleマップ・食べログ検索用リンクです。`,
          sourceType: 'fallback_search',
          confidence: 'medium',
        },
      ],
      isAiGrounded: false,
      warning: 'ネットワークまたはサーバー通信エラーのため、標準検索リンクを提示しています。',
    };
  }
}
