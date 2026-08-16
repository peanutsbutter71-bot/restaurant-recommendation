import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'motion/react';
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Sparkles,
  MapPin,
  Utensils,
  ExternalLink,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Flame,
  Award,
  Compass,
  SmilePlus,
} from 'lucide-react';
import { RestaurantSpot, SwipeDirection, UserPreferenceScores } from '../types';
import {
  getGenreStyle,
  getSceneStyle,
  PRICE_COLORS,
  generateRecommenderAvatar,
  getOptimizedImageUrl,
} from '../utils/helpers';
import {
  getSortedDiscoverDeck,
  getPreferenceSummary,
} from '../utils/swipePreferences';
import { SwipePreferenceInsightWidget } from './SwipePreferenceInsightWidget';

interface DiscoverSwipeViewProps {
  allSpots: RestaurantSpot[];
  preferenceScores: UserPreferenceScores;
  onSwipe: (spot: RestaurantSpot, direction: SwipeDirection) => void;
  onResetPreferences: () => void;
  onSelectSpot: (spot: RestaurantSpot) => void;
  onSwitchToListTab: () => void;
  onShowToast: (msg: string) => void;
}

export const DiscoverSwipeView: React.FC<DiscoverSwipeViewProps> = ({
  allSpots,
  preferenceScores,
  onSwipe,
  onResetPreferences,
  onSelectSpot,
  onSwitchToListTab,
  onShowToast,
}) => {
  // Deck of spots to swipe
  const [deck, setDeck] = useState<RestaurantSpot[]>([]);
  const [lastSwiped, setLastSwiped] = useState<{ spot: RestaurantSpot; dir: SwipeDirection } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Initialize and update deck based on preference scores
  useEffect(() => {
    const sortedDeck = getSortedDiscoverDeck(allSpots, preferenceScores);
    setDeck(sortedDeck);
  }, [allSpots, preferenceScores]);

  // Motion controls for top card
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Derived transforms for 2026 slick motion: dynamic rotation, responsive scale, and directional tints
  const rotate = useTransform(x, [-260, 0, 260], [-22, 0, 22]);
  const cardScale = useTransform(x, [-200, 0, 200], [1.03, 1, 1.03]);

  // Opacity for decision stamps
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -100], [0, 1]);
  const superlikeOpacity = useTransform(y, [-20, -90], [0, 1]);

  // Color tint overlays based on drag direction
  // Right = Emerald / Teal (Like)
  const likeTintOpacity = useTransform(x, [0, 180], [0, 0.45]);
  // Left = Crimson / Rose (Dislike)
  const nopeTintOpacity = useTransform(x, [0, -180], [0, 0.45]);
  // Up = Amber / Gold (Superlike)
  const superlikeTintOpacity = useTransform(y, [0, -140], [0, 0.5]);

  // Border glow aura opacity
  const rightGlowOpacity = useTransform(x, [10, 140], [0, 1]);
  const leftGlowOpacity = useTransform(x, [-10, -140], [0, 1]);
  const upGlowOpacity = useTransform(y, [-10, -100], [0, 1]);

  const currentSpot = deck[0];
  const nextSpot = deck[1];
  const thirdSpot = deck[2];

  // Trigger swipe programmatically or via drag
  const handleSwipeAction = async (direction: SwipeDirection) => {
    if (!currentSpot) return;

    if (direction === 'right') {
      await controls.start({
        x: 480,
        opacity: 0,
        rotate: 24,
        transition: { duration: 0.35, ease: 'easeOut' },
      });
      onShowToast(`💖「${currentSpot.name}」を行きたいリストに追加しました！`);
    } else if (direction === 'left') {
      await controls.start({
        x: -480,
        opacity: 0,
        rotate: -24,
        transition: { duration: 0.35, ease: 'easeOut' },
      });
    } else if (direction === 'up') {
      await controls.start({
        y: -540,
        opacity: 0,
        scale: 1.12,
        transition: { duration: 0.35, ease: 'easeOut' },
      });
      onShowToast(`⭐「${currentSpot.name}」をお気に入り＆行きたいに追加しました！`);
    }

    setLastSwiped({ spot: currentSpot, dir: direction });
    onSwipe(currentSpot, direction);

    // Reset motion values
    x.set(0);
    y.set(0);
    controls.set({ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 });

    // Check if milestone reached (e.g. 10th swipe, or deck finished)
    const newTotal = preferenceScores.totalSwipedCount + 1;
    if (newTotal === 10 || (deck.length === 1 && newTotal >= 5)) {
      setTimeout(() => {
        setShowSummaryModal(true);
      }, 400);
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 90;
    const verticalThreshold = -80;

    if (info.offset.y < verticalThreshold && Math.abs(info.offset.x) < 70) {
      // Superlike up
      handleSwipeAction('up');
    } else if (info.offset.x > swipeThreshold) {
      // Like right
      handleSwipeAction('right');
    } else if (info.offset.x < -swipeThreshold) {
      // Nope left
      handleSwipeAction('left');
    } else {
      // Snap back with crisp spring physics
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 450, damping: 26 },
      });
    }
  };

  const preferenceSummary = getPreferenceSummary(preferenceScores);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-between min-h-[calc(100vh-130px)] py-2 sm:py-3 px-2 sm:px-4 space-y-3">
      {/* Top Header Bar & Preference Insight Widget Area */}
      <div className="w-full space-y-2 px-1">
        {/* Header Title Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2D4B3E] flex items-center justify-center text-emerald-200 shadow-2xs">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-stone-900 tracking-tight">
                  発見スワイプ
                </span>
                <span className="px-2 py-0.2 rounded-full bg-[#2D4B3E] text-emerald-100 text-[10px] font-semibold">
                  {preferenceScores.totalSwipedCount}件 スワイプ済
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden xs:block">
                直感で選ぶほどおすすめの精度がアップします
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {preferenceScores.totalSwipedCount > 0 && (
              <button
                id="discover-summary-btn"
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-[#E8ECE8] hover:text-[#2D4B3E] hover:border-[#C5D8C5] text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                title="好みの分析レポートを見る"
              >
                <Award className="w-3.5 h-3.5 text-[#2D4B3E]" />
                <span className="hidden sm:inline">好みの分析</span>
              </button>
            )}

            <button
              id="discover-help-btn"
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-800 text-xs shadow-2xs cursor-pointer"
              title="操作ガイド"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 🌟 リアルタイム好み学習・おすすめジャンル＆エリア可視化ウィジェット */}
        <SwipePreferenceInsightWidget
          preferenceScores={preferenceScores}
          onOpenDetailedSummary={() => setShowSummaryModal(true)}
        />
      </div>

      {/* Help Guide Banner (Collapsible) */}
      {showHelpGuide && (
        <div className="w-full bg-stone-900 text-white rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-emerald-300">
              👉 右: 行きたい (+3pt)
            </span>
            <span className="flex items-center gap-1 font-medium text-orange-300">
              👆 上: お気に入り (+5pt)
            </span>
            <span className="flex items-center gap-1 font-medium text-stone-400">
              👈 左: パス (-2pt)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpGuide(false)}
            className="text-stone-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Card Deck Area */}
      <div className="relative w-full aspect-[3/4.3] sm:aspect-[3/4.1] max-h-[560px] my-auto flex items-center justify-center">
        {deck.length === 0 ? (
          /* Empty / Completed Deck View */
          <div className="w-full h-full bg-white rounded-2xl border border-stone-200 shadow-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-[#2D4B3E] flex items-center justify-center text-emerald-200 shadow-md">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">
                すべてのお店をチェックしました
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
                スワイプしたお店は「行きたいリスト」に自動整理されています。好みの分析をチェックしてみましょう。
              </p>
            </div>

            {/* Quick Summary Preview */}
            {(preferenceSummary.topGenres.length > 0 || preferenceSummary.topAreas.length > 0) && (
              <div className="w-full bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-left space-y-2">
                <div className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#2D4B3E]" />
                  <span>あなたのおすすめ傾向:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preferenceSummary.topGenres.map((g) => (
                    <span
                      key={g.name}
                      className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-xs font-medium"
                    >
                      {g.name}
                    </span>
                  ))}
                  {preferenceSummary.topAreas.map((a) => (
                    <span
                      key={a.name}
                      className="px-2 py-0.5 rounded-md bg-[#2D4B3E] text-white text-xs font-medium"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
              <button
                type="button"
                id="discover-go-to-list-btn"
                onClick={onSwitchToListTab}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2D4B3E] hover:bg-[#233B31] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>一覧画面で行きたい店を見る</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="discover-reset-deck-btn"
                onClick={() => {
                  onResetPreferences();
                  onShowToast('🔄 スワイプ履歴と好みをリセットしました');
                }}
                className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>もう一度スワイプする</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Third Card (Background depth) */}
            {thirdSpot && (
              <div className="absolute inset-0 rounded-2xl bg-stone-200 border border-stone-300 scale-[0.92] translate-y-5 pointer-events-none opacity-40 shadow-xs" />
            )}

            {/* Second Card (Background preview) */}
            {nextSpot && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden bg-stone-900 border border-stone-300 scale-[0.96] translate-y-2.5 pointer-events-none opacity-85 shadow-lg transition-transform">
                <img
                  src={getOptimizedImageUrl(nextSpot.imageUrl, 720)}
                  alt={nextSpot.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent" />
              </div>
            )}

            {/* Top Interactive Swipe Card (2026 Immersive Visual Card with Dynamic Glow and Directional Color Tint) */}
            {currentSpot && (
              <motion.div
                id={`swipe-card-${currentSpot.id}`}
                className="absolute inset-0 rounded-2xl overflow-hidden bg-stone-950 shadow-xl cursor-grab active:cursor-grabbing touch-none select-none transition-shadow duration-150 border border-stone-800"
                style={{
                  x,
                  y,
                  rotate,
                  scale: cardScale,
                }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.9}
                onDragEnd={handleDragEnd}
                animate={controls}
              >
                {/* Full-bleed Photo Background */}
                <div className="relative w-full h-full overflow-hidden rounded-2xl">
                  <img
                    src={getOptimizedImageUrl(currentSpot.imageUrl, 720)}
                    alt={currentSpot.name}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    decoding="async"
                  />

                  {/* Multi-step Atmospheric Gradient Overlays for high legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

                  {/* 🌈 DIRECTIONAL COLOR FEEDBACK OVERLAYS (Dynamic Tints) */}
                  {/* 1. RIGHT SWIPE TINT (Emerald Green / Like) */}
                  <motion.div
                    style={{ opacity: likeTintOpacity }}
                    className="absolute inset-0 bg-gradient-to-tr from-emerald-600/35 via-teal-600/20 to-transparent pointer-events-none z-10"
                  />

                  {/* 2. LEFT SWIPE TINT (Rose Red / Dislike) */}
                  <motion.div
                    style={{ opacity: nopeTintOpacity }}
                    className="absolute inset-0 bg-gradient-to-tl from-stone-900/50 via-stone-800/30 to-transparent pointer-events-none z-10"
                  />

                  {/* 3. UP SWIPE TINT (Sage Green / Superlike) */}
                  <motion.div
                    style={{ opacity: superlikeTintOpacity }}
                    className="absolute inset-0 bg-gradient-to-t from-[#2D4B3E]/50 via-[#1E332A]/30 to-transparent pointer-events-none z-10"
                  />

                  {/* 🌟 DIRECTIONAL GLOW BORDERS */}
                  <motion.div
                    style={{ opacity: rightGlowOpacity }}
                    className="absolute inset-0 rounded-2xl border-2 border-emerald-400 pointer-events-none z-20"
                  />
                  <motion.div
                    style={{ opacity: leftGlowOpacity }}
                    className="absolute inset-0 rounded-2xl border-2 border-stone-400 pointer-events-none z-20"
                  />
                  <motion.div
                    style={{ opacity: upGlowOpacity }}
                    className="absolute inset-0 rounded-2xl border-2 border-[#2D4B3E] pointer-events-none z-20"
                  />

                  {/* Default subtle card border */}
                  <div className="absolute inset-0 rounded-2xl border border-white/15 pointer-events-none z-15" />

                  {/* Swipe Decision Stamps / Badges (Smooth Fade-in on Drag) */}
                  {/* LIKE STAMP (Right) */}
                  <motion.div
                    style={{ opacity: likeOpacity }}
                    className="absolute top-6 left-6 rotate-[-12deg] border-2 border-emerald-400 bg-emerald-700/90 backdrop-blur-md px-3.5 py-1 rounded-xl text-white font-bold text-base tracking-wider shadow-lg flex items-center gap-1.5 pointer-events-none z-30"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    <span>行きたい！</span>
                  </motion.div>

                  {/* NOPE STAMP (Left) */}
                  <motion.div
                    style={{ opacity: nopeOpacity }}
                    className="absolute top-6 right-6 rotate-[12deg] border-2 border-stone-400 bg-stone-800/80 backdrop-blur-md px-3.5 py-1 rounded-xl text-stone-200 font-bold text-base tracking-wider shadow-lg flex items-center gap-1.5 pointer-events-none z-30"
                  >
                    <X className="w-4 h-4" />
                    <span>パス</span>
                  </motion.div>

                  {/* SUPERLIKE STAMP (Top) */}
                  <motion.div
                    style={{ opacity: superlikeOpacity }}
                    className="absolute top-6 inset-x-0 mx-auto w-fit border-2 border-emerald-300 bg-[#2D4B3E]/90 backdrop-blur-md px-4 py-1.5 rounded-xl text-white font-bold text-base tracking-wider shadow-lg flex items-center gap-1.5 pointer-events-none z-30"
                  >
                    <Star className="w-5 h-5 fill-current" />
                    <span>お気に入り！</span>
                  </motion.div>

                  {/* Top Bar on Card: Area, Price & Detail Button */}
                  <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-25">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white font-medium text-xs">
                        <MapPin className="w-3 h-3 text-emerald-200" />
                        {currentSpot.area}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-stone-200 font-medium text-xs">
                        {currentSpot.priceRange}
                      </span>
                    </div>

                    <button
                      type="button"
                      id={`swipe-detail-btn-${currentSpot.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpot(currentSpot);
                      }}
                      className="p-1.5 rounded-md bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 transition-all active:scale-90 cursor-pointer shadow-xs"
                      title="詳細情報を開く"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Content: Stories-like Rich Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 text-white space-y-2.5 z-25">
                    {/* Tags: Genres & Scenes */}
                    <div className="flex flex-wrap gap-1">
                      {currentSpot.genres.map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-stone-200 text-[10px] font-medium"
                        >
                          {g}
                        </span>
                      ))}
                      {currentSpot.scenes.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-orange-600/80 backdrop-blur-md border border-orange-400/40 text-white text-[10px] font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Shop Name & Highlight */}
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight drop-shadow-xs text-white">
                        {currentSpot.name}
                      </h2>
                      {currentSpot.highlightDish && (
                        <p className="text-xs font-semibold text-orange-400 mt-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-orange-400 shrink-0" />
                          <span>名物: {currentSpot.highlightDish}</span>
                        </p>
                      )}
                    </div>

                    {/* Recommender Quote Card (Instagram Stories / Editorial Note) */}
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-3 space-y-1 shadow-sm">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const av = generateRecommenderAvatar(currentSpot.recommender);
                          return (
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${av.bg} ${av.text}`}
                            >
                              {av.initial}
                            </span>
                          );
                        })()}
                        <span className="text-[11px] font-semibold text-white/90">
                          {currentSpot.recommender} のおすすめコメント
                        </span>
                      </div>
                      <p className="text-xs font-normal text-white/95 leading-relaxed line-clamp-3">
                        「{currentSpot.comment}」
                      </p>
                    </div>

                    {/* Tap for more details notice */}
                    <div className="flex items-center justify-between text-[11px] text-white/70 pt-0.5">
                      <span>スワイプで振り分け</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSpot(currentSpot);
                        }}
                        className="text-orange-300 hover:text-white hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                      >
                        <span>詳しく見る</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Bottom Floating Control Buttons */}
      {currentSpot && (
        <div className="w-full max-w-xs flex items-center justify-center gap-4 mt-1 sm:mt-2">
          {/* 1. DISLIKE / PASS BUTTON */}
          <button
            id="swipe-btn-dislike"
            type="button"
            onClick={() => handleSwipeAction('left')}
            className="w-12 h-12 rounded-full bg-white hover:bg-stone-100 border border-stone-300 text-stone-600 hover:text-stone-900 shadow-sm transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
            title="興味ない（左スワイプ）"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>

          {/* 2. SUPERLIKE / INSTANT FAVORITE BUTTON */}
          <button
            id="swipe-btn-superlike"
            type="button"
            onClick={() => handleSwipeAction('up')}
            className="w-10 h-10 rounded-full bg-[#E8ECE8] hover:bg-[#D8ECD8] border border-[#C5D8C5] text-[#2D4B3E] shadow-sm transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
            title="お気に入りに即追加（上スワイプ）"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          {/* 3. LIKE / WANT TO GO BUTTON */}
          <button
            id="swipe-btn-like"
            type="button"
            onClick={() => handleSwipeAction('right')}
            className="w-12 h-12 rounded-full bg-[#2D4B3E] hover:bg-[#233B31] text-white shadow-sm transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer"
            title="行きたい！（右スワイプ）"
          >
            <Heart className="w-5 h-5 fill-current" />
          </button>
        </div>
      )}

      {/* Preference Analysis Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-amber-600 flex items-center justify-center text-amber-300 shadow-md shadow-slate-900/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    あなたの好みが分かってきました！
                  </h3>
                  <p className="text-xs text-stone-500">
                    スワイプ結果からAIが傾向をスコアリング
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-100/90 rounded-2xl p-3 border border-slate-200">
                <div className="text-lg font-black text-slate-900">
                  {preferenceSummary.totalSwiped}
                </div>
                <div className="text-[10px] font-bold text-stone-500">スワイプ総数</div>
              </div>
              <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200">
                <div className="text-lg font-black text-emerald-700">
                  {preferenceSummary.likedCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-800">行きたい！</div>
              </div>
              <div className="bg-stone-100/80 rounded-2xl p-3 border border-stone-200">
                <div className="text-lg font-black text-stone-600">
                  {preferenceSummary.passedCount}
                </div>
                <div className="text-[10px] font-bold text-stone-500">パス</div>
              </div>
            </div>

            {/* Top Categories (Genres, Areas, Scenes) */}
            <div className="space-y-3">
              {/* Genres */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <span>あなたが高スコアをつけたジャンル</span>
                </h4>
                {preferenceSummary.topGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferenceSummary.topGenres.map((g) => (
                      <span
                        key={g.name}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-zinc-800 text-amber-300 border border-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{g.name}</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-black">+{g.score}pt</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">まだ十分なデータがありません</p>
                )}
              </div>

              {/* Areas */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>好みのエリア</span>
                </h4>
                {preferenceSummary.topAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferenceSummary.topAreas.map((a) => (
                      <span
                        key={a.name}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-1"
                      >
                        <span>{a.name}</span>
                        <span className="text-[10px] text-amber-700 font-black">+{a.score}pt</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">まだ十分なデータがありません</p>
                )}
              </div>

              {/* Scenes */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>よく選ぶ利用シーン</span>
                </h4>
                {preferenceSummary.topScenes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferenceSummary.topScenes.map((s) => (
                      <span
                        key={s.name}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1"
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] text-stone-500 font-bold">+{s.score}pt</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">まだ十分なデータがありません</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                id="summary-switch-to-list-btn"
                onClick={() => {
                  setShowSummaryModal(false);
                  onSwitchToListTab();
                }}
                className="w-full py-3 rounded-2xl bg-[#2D4B3E] hover:bg-[#233B31] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>行きたいリストを確認する</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
              >
                スワイプを続ける
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

