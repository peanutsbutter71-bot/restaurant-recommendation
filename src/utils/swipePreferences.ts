import { RestaurantSpot, UserPreferenceScores, SwipeDirection } from '../types';

export const INITIAL_PREFERENCES: UserPreferenceScores = {
  genres: {},
  scenes: {},
  priceRanges: {},
  areas: {},
  swipedSpotIds: {},
  totalSwipedCount: 0,
};

/**
 * スワイプ結果に応じてタグのスコアを加減点する
 * - 右スワイプ (liked / 行きたい): +3
 * - 上スワイプ (superliked / お気に入り即追加): +5
 * - 左スワイプ (disliked / 興味ない): -2
 */
export function updatePreferencesWithSwipe(
  currentPrefs: UserPreferenceScores,
  spot: RestaurantSpot,
  direction: SwipeDirection
): UserPreferenceScores {
  const next: UserPreferenceScores = {
    genres: { ...currentPrefs.genres },
    scenes: { ...currentPrefs.scenes },
    priceRanges: { ...currentPrefs.priceRanges },
    areas: { ...currentPrefs.areas },
    swipedSpotIds: { ...currentPrefs.swipedSpotIds },
    totalSwipedCount: currentPrefs.totalSwipedCount + 1,
  };

  const delta = direction === 'up' ? 5 : direction === 'right' ? 3 : -2;
  const status = direction === 'up' ? 'superliked' : direction === 'right' ? 'liked' : 'disliked';
  next.swipedSpotIds[spot.id] = status;

  // ジャンル加減点
  spot.genres.forEach((g) => {
    next.genres[g] = (next.genres[g] || 0) + delta;
  });

  // シーン加減点
  spot.scenes.forEach((s) => {
    next.scenes[s] = (next.scenes[s] || 0) + delta;
  });

  // 価格帯加減点
  if (spot.priceRange) {
    next.priceRanges[spot.priceRange] = (next.priceRanges[spot.priceRange] || 0) + delta;
  }

  // エリア加減点
  if (spot.area) {
    next.areas[spot.area] = (next.areas[spot.area] || 0) + (delta > 0 ? 1 : -1);
  }

  return next;
}

/**
 * 各スポットの好みに基づくスコアを計算
 */
export function calculateSpotScore(
  spot: RestaurantSpot,
  prefs: UserPreferenceScores
): number {
  let score = 0;

  spot.genres.forEach((g) => {
    score += (prefs.genres[g] || 0) * 1.5;
  });

  spot.scenes.forEach((s) => {
    score += (prefs.scenes[s] || 0) * 1.2;
  });

  if (spot.priceRange) {
    score += prefs.priceRanges[spot.priceRange] || 0;
  }

  if (spot.area) {
    score += (prefs.areas[spot.area] || 0) * 0.8;
  }

  return score;
}

/**
 * 未スワイプのお店を好みのスコア順にソートしてカードデッキを生成
 */
export function getSortedDiscoverDeck(
  allSpots: RestaurantSpot[],
  prefs: UserPreferenceScores
): RestaurantSpot[] {
  // 未スワイプのお店を抽出（閉店・閉業の店舗はスキップ）
  const unswiped = allSpots.filter(
    (s) =>
      !prefs.swipedSpotIds[s.id] &&
      s.operatingStatus !== 'permanently_closed'
  );

  // スコア順にソート (同点の場合は作成日やIDで安定ソート)
  return [...unswiped].sort((a, b) => {
    const scoreA = calculateSpotScore(a, prefs);
    const scoreB = calculateSpotScore(b, prefs);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // 未訪問を少し優先
    if (!a.isVisited && b.isVisited) return -1;
    if (a.isVisited && !b.isVisited) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * ユーザーの好みサマリーを計算（上位ジャンル、上位シーン、おすすめエリア、おすすめ価格帯）
 */
export function getPreferenceSummary(prefs: UserPreferenceScores) {
  const topGenres = Object.entries(prefs.genres)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const topScenes = Object.entries(prefs.scenes)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const topAreas = Object.entries(prefs.areas)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const topPriceRanges = Object.entries(prefs.priceRanges)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const likedCount = Object.values(prefs.swipedSpotIds).filter(
    (v) => v === 'liked' || v === 'superliked'
  ).length;

  const passedCount = Object.values(prefs.swipedSpotIds).filter(
    (v) => v === 'disliked'
  ).length;

  // 学習レベル（1〜5）と精度パーセンテージ
  const level = Math.min(5, Math.floor(prefs.totalSwipedCount / 3) + 1);
  const confidencePercent = Math.min(100, Math.round((prefs.totalSwipedCount / 12) * 100));

  return {
    topGenres: topGenres.slice(0, 4),
    topScenes: topScenes.slice(0, 3),
    topAreas: topAreas.slice(0, 3),
    topPriceRanges: topPriceRanges.slice(0, 2),
    totalSwiped: prefs.totalSwipedCount,
    likedCount,
    passedCount,
    level,
    confidencePercent,
  };
}
