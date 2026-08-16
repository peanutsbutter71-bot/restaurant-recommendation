import React, { useState } from 'react';
import {
  Sparkles,
  Utensils,
  MapPin,
  Flame,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  Coffee,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { UserPreferenceScores } from '../types';
import { getPreferenceSummary } from '../utils/swipePreferences';

interface SwipePreferenceInsightWidgetProps {
  preferenceScores: UserPreferenceScores;
  onOpenDetailedSummary?: () => void;
}

export const SwipePreferenceInsightWidget: React.FC<SwipePreferenceInsightWidgetProps> = ({
  preferenceScores,
  onOpenDetailedSummary,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const summary = getPreferenceSummary(preferenceScores);

  const hasPreferences =
    summary.topGenres.length > 0 ||
    summary.topAreas.length > 0 ||
    summary.topScenes.length > 0;

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-stone-50/60 transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#2D4B3E] flex items-center justify-center text-emerald-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 tracking-tight">
                好み学習インサイト
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#E8ECE8] text-[#2D4B3E] border border-[#C5D8C5] text-[10px] font-semibold">
                Lv.{summary.level}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress Mini Bar */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-stone-500 font-medium">
            <span>精度</span>
            <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 rounded-full transition-all duration-500"
                style={{ width: `${summary.confidencePercent}%` }}
              />
            </div>
            <span className="font-bold text-stone-800">{summary.confidencePercent}%</span>
          </div>

          <button
            type="button"
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            title={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content View */}
      {isExpanded && (
        <div className="px-3.5 pb-3 pt-0.5 border-t border-stone-100 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {!hasPreferences ? (
            /* Initial state before swiping */
            <div className="py-2 text-center space-y-1">
              <p className="text-[11px] text-stone-600 font-medium">
                カードを左右にスワイプすると、あなたの好きなジャンルやエリアをリアルタイムで学習します！
              </p>
              <div className="flex items-center justify-center gap-3 text-[10px] text-stone-600 font-bold pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  右: 行きたい
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2D4B3E]" />
                  上: お気に入り
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  左: パス
                </span>
              </div>
            </div>
          ) : (
            /* Real-time Preferred Tags & Areas Display */
            <div className="space-y-2">
              {/* Recommended Genres & Areas Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Top Recommended Genres */}
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-200/70 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-800">
                    <span className="flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-stone-600" />
                      おすすめジャンル
                    </span>
                    <span className="text-[9px] text-stone-400">好感度スコア</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {summary.topGenres.length > 0 ? (
                      summary.topGenres.map((g) => (
                        <span
                          key={g.name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-stone-800 text-[10px] font-semibold border border-stone-200 shadow-2xs"
                        >
                          <span>{g.name}</span>
                          <span className="text-[9px] font-bold text-[#2D4B3E] bg-[#E8ECE8] px-1 rounded-sm">
                            +{g.score}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">学習中...</span>
                    )}
                  </div>
                </div>

                {/* Top Recommended Areas */}
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-200/70 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-800">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#2D4B3E]" />
                      おすすめエリア
                    </span>
                    <span className="text-[9px] text-stone-400">好感度スコア</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {summary.topAreas.length > 0 ? (
                      summary.topAreas.map((a) => (
                        <span
                          key={a.name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-stone-800 text-[10px] font-semibold border border-stone-200 shadow-2xs"
                        >
                          <span>{a.name}</span>
                          <span className="text-[9px] font-bold text-[#2D4B3E] bg-[#E8ECE8] px-1 rounded-sm">
                            +{a.score}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">学習中...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub bar: Top Scenes & Detailed Report Link */}
              <div className="flex items-center justify-between pt-0.5 text-[10px]">
                <div className="flex items-center gap-1 text-stone-500 overflow-hidden">
                  <span className="font-bold text-stone-700 shrink-0">好みのシーン:</span>
                  <div className="flex items-center gap-1 truncate">
                    {summary.topScenes.length > 0 ? (
                      summary.topScenes.map((s) => (
                        <span
                          key={s.name}
                          className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-medium"
                        >
                          {s.name} (+{s.score})
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400">データ蓄積中</span>
                    )}
                  </div>
                </div>

                {onOpenDetailedSummary && (
                  <button
                    type="button"
                    onClick={onOpenDetailedSummary}
                    className="text-stone-800 hover:text-[#2D4B3E] font-semibold shrink-0 hover:underline cursor-pointer flex items-center gap-0.5 ml-2"
                  >
                    <span>詳細レポート</span>
                    <TrendingUp className="w-3 h-3 text-[#2D4B3E]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
