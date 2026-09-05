import React from 'react';
import { UtensilsCrossed, Plus, Dices, Heart, Share2, User, ListFilter, Flame, Layers, HelpCircle, MessageSquare } from 'lucide-react';
import { MainTab } from '../types';

interface HeaderProps {
  spotCount: number;
  favoriteCount: number;
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onOpenAddModal: () => void;
  onOpenQuickImport: () => void;
  onOpenBulkImport?: () => void;
  onOpenRandomModal: () => void;
  onOpenMyPage?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenTutorial?: () => void;
  onOpenNameSetup?: () => void;
  onOpenFeedback?: () => void;
  currentUserName?: string | null;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  spotCount,
  favoriteCount,
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenQuickImport,
  onOpenBulkImport,
  onOpenRandomModal,
  onOpenMyPage,
  favoritesOnly,
  onToggleFavoritesOnly,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fafaf9]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Tab Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => onTabChange('list')}
              className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-[#2D4B3E] flex items-center justify-center text-stone-100 shadow-xs group-hover:bg-[#233B31] transition-colors">
                <UtensilsCrossed className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="hidden xs:block">
                <span className="text-base sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap">
                  Gourmet<span className="text-[#2D4B3E] font-extrabold">Share</span>
                </span>
              </div>
            </button>

            {/* Main Tabs: List vs Discover */}
            <div className="flex items-center p-0.5 bg-stone-200/70 rounded-lg border border-stone-200 shrink-0">
              <button
                type="button"
                id="header-tab-list"
                onClick={() => onTabChange('list')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'list'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>一覧</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                  {spotCount}
                </span>
              </button>

              <button
                type="button"
                id="header-tab-discover"
                onClick={() => onTabChange('discover')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'discover'
                    ? 'bg-[#2D4B3E] text-white shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${activeTab === 'discover' ? 'text-emerald-200' : 'text-stone-400'}`} />
                <span>発見</span>
              </button>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Single URL Import */}
            <button
              id="header-quick-share-import-btn"
              onClick={onOpenQuickImport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200 transition-all cursor-pointer whitespace-nowrap"
              title="食べログ・Googleマップ・InstagramのURLからAI一発登録"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden md:inline">URL登録</span>
              <span className="md:hidden">URL</span>
            </button>

            {/* Bulk Import Button */}
            {onOpenBulkImport && (
              <button
                id="header-bulk-import-btn"
                onClick={onOpenBulkImport}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#E8ECE8] hover:bg-[#D8ECD8] text-[#2D4B3E] border border-[#C5D8C5] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                title="複数のGoogle Maps / 食べログURLをまとめて一括登録"
              >
                <Layers className="w-3.5 h-3.5 text-[#2D4B3E]" />
                <span className="hidden md:inline">一括登録</span>
                <span className="md:hidden">一括</span>
                <span className="text-[9px] bg-[#2D4B3E] text-white font-extrabold px-1 rounded">
                  NEW
                </span>
              </button>
            )}

            {/* Favorites Only Toggle */}
            <button
              id="header-fav-toggle-btn"
              onClick={onToggleFavoritesOnly}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer whitespace-nowrap ${
                favoritesOnly
                  ? 'bg-[#E8ECE8] text-[#2D4B3E] border-[#C5D8C5] shadow-2xs font-bold'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
              title="お気に入りのみ表示"
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current text-[#2D4B3E]' : 'text-stone-400'}`} />
              <span className="hidden lg:inline">お気に入り</span>
              <span className={`text-[10px] px-1 py-0.2 rounded ${favoritesOnly ? 'bg-[#D8ECD8] text-[#2D4B3E]' : 'bg-stone-100 text-stone-500'}`}>
                {favoriteCount}
              </span>
            </button>

            {/* Roulette Button */}
            <button
              id="header-random-roulette-btn"
              onClick={onOpenRandomModal}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
              title="今日どこ行く？迷ったら決断アシスタント"
            >
              <Dices className="w-4 h-4 text-stone-500" />
              <span className="hidden xl:inline">決定アシスタント</span>
            </button>

            {/* Tutorial / Help Guide Button */}
            {onOpenTutorial && (
              <button
                id="header-tutorial-btn"
                onClick={onOpenTutorial}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-[#E8ECE8] text-[#2D4B3E] hover:bg-[#D8ECD8] border border-[#C5D8C5] transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-2xs"
                title="使い方・機能ガイドを見る"
              >
                <HelpCircle className="w-4 h-4 text-[#2D4B3E]" />
                <span className="hidden md:inline">使い方</span>
              </button>
            )}

            {/* User Name Setup Button */}
            {onOpenNameSetup && (
              <button
                id="header-[#2D4B3E]-name-btn"
                onClick={onOpenNameSetup}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-[#2D4B3E] hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-2xs"
                title="自分の表示名（ニックネーム）を設定・変更"
              >
                <User className="w-3.5 h-3.5 text-[#2D4B3E]" />
                <span className="hidden sm:inline font-bold">
                  {currentUserName ? `👤 ${currentUserName}` : '名前設定'}
                </span>
                <span className="sm:hidden font-bold">名前</span>
              </button>
            )}

            {/* Direct Google Form Feedback Button */}
            {onOpenFeedback && (
              <button
                id="header-feedback-btn"
                onClick={onOpenFeedback}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-2xs"
                title="ご意見・バグ報告・改善リクエストを送信 (Googleフォーム)"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden lg:inline font-bold">ご意見・FB</span>
              </button>
            )}

            {/* MyPage Button */}
            {onOpenMyPage && (
              <button
                id="header-mypage-btn"
                onClick={onOpenMyPage}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="マイページ（統計・フォルダ・バックアップ）"
              >
                <User className="w-4 h-4 text-stone-600" />
                <span className="hidden xl:inline">マイページ</span>
              </button>
            )}

            {/* Primary CTA: Add Spot */}
            <button
              id="header-add-spot-btn"
              onClick={onOpenAddModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#2D4B3E] hover:bg-[#233B31] shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">お店を記録</span>
              <span className="sm:hidden">記録</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
