import { RestaurantSpot, Scene, PriceRange } from '../types';

export const GENRE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'カフェ': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  'スイーツ': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  'イタリアン': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  'ビストロ': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '居酒屋': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  'ラーメン': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '韓国料理': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '和食': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '焼肉': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '中華': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  'その他': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
};

export const SCENE_COLORS: Record<Scene, { bg: string; text: string; border: string }> = {
  'デート': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '女子会': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '飲み会': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '2次会': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '一人飯': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '接待': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
  '記念日': { bg: 'bg-stone-100/90', text: 'text-stone-800', border: 'border-stone-200' },
};

export const PRICE_COLORS: Record<PriceRange, { bg: string; text: string; border: string }> = {
  '〜1000円': { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
  '1000〜3000円': { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
  '3000〜5000円': { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
  '5000円〜': { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
};

export function getGenreStyle(genre: string) {
  return (
    GENRE_COLORS[genre] || {
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-200',
    }
  );
}

export function getSceneStyle(scene: Scene) {
  return (
    SCENE_COLORS[scene] || {
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-200',
    }
  );
}

export function formatJapaneseDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '';
  }
}

export interface RelatedSpotResult {
  spot: RestaurantSpot;
  matchReasons: string[];
  score: number;
}

/**
 * Requirement 3: 「こういうのもおすすめ」機能
 * 詳細画面に、同じエリアまたは同じジャンルタグを持つ他のお店を最大3件、関連おすすめとして表示
 */
export function getRelatedSpots(currentSpot: RestaurantSpot, allSpots: RestaurantSpot[]): RelatedSpotResult[] {
  const otherSpots = allSpots.filter((s) => s.id !== currentSpot.id);

  const scoredSpots: RelatedSpotResult[] = [];

  for (const spot of otherSpots) {
    const matchReasons: string[] = [];
    let score = 0;

    // Area match
    if (spot.area && currentSpot.area && spot.area.trim().toLowerCase() === currentSpot.area.trim().toLowerCase()) {
      matchReasons.push(`同じ「${spot.area}」エリア`);
      score += 3;
    }

    // Genre matches
    const commonGenres = spot.genres.filter((g) => currentSpot.genres.includes(g));
    if (commonGenres.length > 0) {
      matchReasons.push(`同じジャンル「${commonGenres.join('・')}」`);
      score += commonGenres.length * 2;
    }

    // Scene matches (bonus subtle connection)
    const commonScenes = spot.scenes.filter((sc) => currentSpot.scenes.includes(sc));
    if (commonScenes.length > 0) {
      score += 0.5;
    }

    if (score > 0) {
      scoredSpots.push({
        spot,
        matchReasons,
        score,
      });
    }
  }

  // Sort by score descending, then by newest
  scoredSpots.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.spot.createdAt).getTime() - new Date(a.spot.createdAt).getTime();
  });

  return scoredSpots.slice(0, 3);
}

export function generateRecommenderAvatar(name: string): { bg: string; text: string; initial: string } {
  const palette = [
    { bg: 'bg-stone-200', text: 'text-stone-800' },
    { bg: 'bg-stone-800', text: 'text-stone-100' },
    { bg: 'bg-orange-100', text: 'text-orange-900' },
    { bg: 'bg-zinc-200', text: 'text-zinc-800' },
    { bg: 'bg-neutral-300', text: 'text-neutral-900' },
  ];

  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  const color = palette[sum % palette.length];
  const initial = name.trim().slice(0, 1) || '友';

  return { ...color, initial };
}

/**
 * Optimizes image URLs by attaching width and quality parameters (e.g. Unsplash)
 * to prevent loading massive 4K/raw images on cards and list items.
 */
export function getOptimizedImageUrl(url?: string, targetWidth: number = 640): string {
  const fallback = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=640&q=75';
  if (!url || !url.trim()) return fallback;
  const cleanUrl = url.trim();

  if (cleanUrl.includes('images.unsplash.com')) {
    try {
      const u = new URL(cleanUrl);
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', targetWidth.toString());
      u.searchParams.set('q', '75');
      return u.toString();
    } catch {
      return cleanUrl;
    }
  }

  return cleanUrl;
}

