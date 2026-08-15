import React from 'react';
import { UtensilsCrossed, Plus, Dices, Heart, Share2, User, Flame, ListFilter, Users, Layers } from 'lucide-react';
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
  onOpenShareAppModal,
  favoritesOnly,
  onToggleFavoritesOnly,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fafaf9]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Tab Switcher */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => onTabChange('list')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-stone-100 shadow-xs group-hover:bg-orange-600 transition-colors">
                <UtensilsCrossed className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
                    Gourmet<span className="text-orange-600 font-extrabold">Share</span>
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 font-medium hidden md:block">
                  友人のリアルなおすすめグルメノート
                </p>
              </div>
            </button>

            {/* Primary Main Tabs: List vs Discover (Urban Segmented Switcher) */}
            <div className="flex items-center p-0.5 bg-stone-200/70 rounded-lg border border-stone-200">
              <button
                type="button"
                id="header-tab-list"
                onClick={() => onTabChange('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>一覧</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                  {spotCount}
                </span>
              </button>

              <button
                type="button"
                id="header-tab-discover"
                onClick={() => onTabChange('discover')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'discover'
                    ? 'bg-stone-900 text-white shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${activeTab === 'discover' ? 'text-orange-400' : 'text-stone-400'}`} />
                <span>発見</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  activeTab === 'discover' ? 'bg-stone-800 text-orange-300' : 'bg-stone-200 text-stone-600'
                }`}>
                  Flick
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons with Clear Priority */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Secondary: Quick Share URL Import Button */}
            <button
              id="header-quick-share-import-btn"
              onClick={onOpenQuickImport}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200/80 transition-all active:scale-95 cursor-pointer"
              title="食べログ・Googleマップ・InstagramのURLからAI一発登録"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">リンクから登録</span>
              <span className="sm:hidden">URL</span>
              <span className="text-[9px] bg-stone-900 text-stone-100 font-bold px-1.5 py-0.2 rounded hidden xs:inline">
                AI
              </span>
            </button>

            {/* Bulk URL Import Button */}
            {onOpenBulkImport && (
              <button
                id="header-bulk-import-btn"
                onClick={onOpenBulkImport}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="複数のGoogle Maps / 食べログURLをまとめて一括登録"
              >
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">一括登録</span>
                <span className="sm:hidden">一括</span>
                <span className="text-[9px] bg-amber-600 text-white font-extrabold px-1 rounded">
                  NEW
                </span>
              </button>
            )}

            {/* Subdued: Favorites Only Toggle */}
            <button
              id="header-fav-toggle-btn"
              onClick={onToggleFavoritesOnly}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                favoritesOnly
                  ? 'bg-orange-50 text-orange-600 border-orange-300 shadow-2xs font-bold'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
              title="お気に入りのみ表示"
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current text-orange-600' : 'text-stone-400'}`} />
              <span className="hidden md:inline">お気に入り</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${favoritesOnly ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-500'}`}>
                {favoriteCount}
              </span>
            </button>

            {/* Subdued: Roulette Button */}
            <button
              id="header-random-roulette-btn"
              onClick={onOpenRandomModal}
              className="p-1.5 sm:px-2.5 sm:py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="今日どこ行く？迷ったらルーレット"
            >
              <Dices className="w-4 h-4 text-stone-500" />
              <span className="hidden lg:inline">ルーレット</span>
            </button>

            {/* Subdued: MyPage Button */}
            {onOpenMyPage && (
              <button
                id="header-mypage-btn"
                onClick={onOpenMyPage}
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="マイページ（統計・フォルダ・バックアップ）"
              >
                <User className="w-4 h-4 text-stone-500" />
                <span className="hidden lg:inline">マイページ</span>
              </button>
            )}

            {/* Share App / Invite Friends Button */}
            {onOpenShareAppModal && (
              <button
                id="header-share-app-btn"
                onClick={onOpenShareAppModal}
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="友達にアプリや自分のグルメノートを教える"
              >
                <Users className="w-4 h-4 text-orange-600" />
                <span className="hidden xl:inline font-semibold">友達に教える</span>
              </button>
            )}

            {/* Primary CTA: Add Spot */}
            <button
              id="header-add-spot-btn"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-orange-600 active:scale-95 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">お店を記録</span>
              <span className="xs:hidden">記録</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
