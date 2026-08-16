import React, { useState, useMemo } from 'react';
import { X, Sparkles, MapPin, ArrowRight, RefreshCw, MessageSquare, Filter, Utensils, Users2, Bookmark } from 'lucide-react';
import { RestaurantSpot, Scene } from '../types';
import { generateRecommenderAvatar, getOptimizedImageUrl } from '../utils/helpers';

interface RandomRouletteModalProps {
  spots: RestaurantSpot[];
  onClose: () => void;
  onSelectSpot: (spot: RestaurantSpot) => void;
  onShowToast?: (message: string) => void;
}

const ALL_SCENES: Scene[] = ['デート', '女子会', '飲み会', '一人飯', '接待', '記念日'];

export const RandomRouletteModal: React.FC<RandomRouletteModalProps> = ({
  spots,
  onClose,
  onSelectSpot,
  onShowToast,
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('すべて');
  const [selectedScene, setSelectedScene] = useState<string>('指定なし');
  const [unvisitedOnly, setUnvisitedOnly] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Extract available unique areas from spots
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => {
      if (s.area) set.add(s.area);
    });
    return Array.from(set);
  }, [spots]);

  // Compute matching candidate pool
  const candidates = useMemo(() => {
    return spots.filter((spot) => {
      if (unvisitedOnly && spot.isVisited) return false;
      if (selectedArea !== 'すべて' && spot.area !== selectedArea) return false;
      if (selectedScene !== '指定なし' && !spot.scenes.includes(selectedScene as Scene)) return false;
      return true;
    });
  }, [spots, unvisitedOnly, selectedArea, selectedScene]);

  // Active spot safely bound
  const activeSpot = candidates.length > 0 ? candidates[selectedIndex % candidates.length] : null;
  const avatar = activeSpot ? generateRecommenderAvatar(activeSpot.recommender) : null;

  const handleNextShuffle = () => {
    if (candidates.length <= 1) return;
    setIsShuffling(true);
    setTimeout(() => {
      setSelectedIndex((prev) => (prev + 1) % candidates.length);
      setIsShuffling(false);
    }, 150);
  };

  const handleLineInvite = async () => {
    if (!activeSpot) return;
    const inviteText = `【今度ここ行かない？🍴】\n📍 ${activeSpot.name} (${activeSpot.area})\n👤 ${activeSpot.recommender} のおすすめ！\n💰 予算: ${activeSpot.priceRange}${activeSpot.highlightDish ? `\n✨ 推しメニュー: ${activeSpot.highlightDish}` : ''}\n💬「${activeSpot.comment}」\n${
      activeSpot.mapUrl ? `📍 マップ: ${activeSpot.mapUrl}` : activeSpot.tabelogUrl ? `🍽️ 食べログ: ${activeSpot.tabelogUrl}` : ''
    }`;

    const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(inviteText)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `【今度ここ行かない？】${activeSpot.name}`,
          text: inviteText,
        });
        if (onShowToast) onShowToast('LINE・SNS共有メニューを開きました');
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      if (onShowToast) onShowToast('💬 LINEに貼れる招待文をコピーしました！');
      setTimeout(() => setCopied(false), 2500);
      window.open(lineShareUrl, '_blank');
    } catch {
      window.open(lineShareUrl, '_blank');
    }
  };

  return (
    <div
      id="roulette-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="roulette-modal-content"
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 duration-150 p-5 sm:p-6 flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#2D4B3E] text-emerald-200 flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
              <span>今日どこ行く？決断アシスタント</span>
            </h3>
            <p className="text-xs text-stone-500">
              今の気分やエリアから失敗しないお店を選出
            </p>
          </div>
        </div>

        {/* Filter Bar (Area, Scene, Unvisited toggle) */}
        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              条件をしぼり込む
            </span>
            <span className="text-[11px] text-stone-500 font-normal">
              候補: <strong className="text-stone-900">{candidates.length}</strong> 軒
            </span>
          </div>

          {/* Area Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-stone-400 shrink-0 text-[11px] flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> エリア:
            </span>
            <button
              type="button"
              onClick={() => { setSelectedArea('すべて'); setSelectedIndex(0); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedArea === 'すべて'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              すべて
            </button>
            {availableAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => { setSelectedArea(area); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedArea === area
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Scene & Unvisited Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
              <span className="text-stone-400 shrink-0 text-[11px] flex items-center gap-0.5">
                <Users2 className="w-3 h-3" /> シーン:
              </span>
              <button
                type="button"
                onClick={() => { setSelectedScene('指定なし'); setSelectedIndex(0); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                  selectedScene === '指定なし'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                指定なし
              </button>
              {ALL_SCENES.map((scene) => (
                <button
                  key={scene}
                  type="button"
                  onClick={() => { setSelectedScene(scene); setSelectedIndex(0); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    selectedScene === scene
                      ? 'bg-stone-800 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  #{scene}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setUnvisitedOnly(!unvisitedOnly); setSelectedIndex(0); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border transition-colors ${
                unvisitedOnly
                  ? 'bg-[#E8ECE8] border-[#C5D8C5] text-[#2D4B3E]'
                  : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              <Bookmark className={`w-3 h-3 ${unvisitedOnly ? 'text-[#2D4B3E] fill-[#2D4B3E]' : ''}`} />
              <span>未訪問のみ</span>
            </button>
          </div>
        </div>

        {/* Selected Candidate Card */}
        {activeSpot ? (
          <div className={`bg-stone-50 rounded-xl p-3.5 sm:p-4 border border-stone-200 space-y-3 transition-all duration-150 ${isShuffling ? 'opacity-50 scale-98' : 'opacity-100'}`}>
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-stone-900">
              <img
                src={getOptimizedImageUrl(activeSpot.imageUrl, 640)}
                alt={activeSpot.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-white text-stone-900 text-xs font-semibold shadow-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#2D4B3E]" />
                  {activeSpot.area}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-xs font-medium">
                  {activeSpot.priceRange}
                </span>
              </div>

              <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                <h4 className="text-base font-bold line-clamp-1">
                  {activeSpot.name}
                </h4>
              </div>
            </div>

            {/* Recommender Info & Comment */}
            <div className="space-y-1.5">
              {avatar && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[11px] font-medium text-stone-700">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${avatar.bg} ${avatar.text}`}>
                    {avatar.initial}
                  </span>
                  <span>{activeSpot.recommender} のおすすめ</span>
                </div>
              )}
              {activeSpot.highlightDish && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2D4B3E]">
                  <Sparkles className="w-3 h-3" />
                  <span>名物: {activeSpot.highlightDish}</span>
                </span>
              )}
              <p className="text-xs text-stone-700 leading-relaxed font-normal line-clamp-2 bg-white p-2.5 rounded-lg border border-stone-200/70">
                「{activeSpot.comment}」
              </p>
            </div>

            {/* Candidate Alternatives Switcher */}
            {candidates.length > 1 && (
              <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-500">他の候補:</span>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[280px]">
                  {candidates.slice(0, 4).map((cand, idx) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-2 py-0.5 rounded text-[11px] truncate max-w-[90px] cursor-pointer ${
                        cand.id === activeSpot.id
                          ? 'bg-stone-900 text-white font-semibold'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {cand.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-stone-500 space-y-2 mb-4">
            <Utensils className="w-8 h-8 mx-auto text-stone-400 stroke-1" />
            <p className="text-sm font-semibold text-stone-700">条件に合うお店がありません</p>
            <p className="text-xs text-stone-400">
              エリアやシーンの選択を解除するか、「未訪問のみ」のチェックを外してみてください。
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedArea('すべて');
                setSelectedScene('指定なし');
                setUnvisitedOnly(false);
              }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 text-xs font-semibold hover:bg-stone-300 transition-colors cursor-pointer"
            >
              条件をリセット
            </button>
          </div>
        )}

        {/* Action Controls Row */}
        {activeSpot && (
          <div className="flex items-center gap-2 pt-2">
            <button
              id="assistant-shuffle-btn"
              type="button"
              onClick={handleNextShuffle}
              disabled={candidates.length <= 1 || isShuffling}
              className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              title="別の候補にする"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>チェンジ</span>
            </button>

            <button
              id="assistant-line-invite-btn"
              type="button"
              onClick={handleLineInvite}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{copied ? 'コピー完了' : 'LINEで誘う'}</span>
            </button>

            <button
              id="assistant-select-btn"
              type="button"
              onClick={() => {
                onSelectSpot(activeSpot);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>詳細を見る</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
