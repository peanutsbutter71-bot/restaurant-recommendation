import React from 'react';
import { Heart, MapPin, Sparkles, ArrowUpRight, Check, Bookmark, Lock, FolderOpen } from 'lucide-react';
import { RestaurantSpot } from '../types';
import {
  PRICE_COLORS,
  generateRecommenderAvatar,
  getOptimizedImageUrl,
} from '../utils/helpers';
import { getOperatingStatusBadge } from '../utils/aiStatusCheck';

interface SpotCardProps {
  spot: RestaurantSpot;
  onSelect: (spot: RestaurantSpot) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onToggleVisited?: (id: string, e: React.MouseEvent) => void;
}

export const SpotCard: React.FC<SpotCardProps> = ({
  spot,
  onSelect,
  onToggleFavorite,
  onToggleVisited,
}) => {
  const avatar = generateRecommenderAvatar(spot.recommender);
  const statusBadge = getOperatingStatusBadge(spot.operatingStatus);
  const optimizedImageUrl = getOptimizedImageUrl(spot.imageUrl, 640);

  return (
    <div
      id={`spot-card-${spot.id}`}
      onClick={() => onSelect(spot)}
      className={`group relative bg-white rounded-2xl border overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer ${
        statusBadge.isAlert ? 'border-red-300 bg-red-50/10' : 'border-stone-200/90'
      }`}
    >
      {/* Image Container - Photography as Hero */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-stone-100">
        <img
          src={optimizedImageUrl}
          alt={spot.name}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />

        {/* Subtle Gradient Overlay for visual depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top Badges: Area & Controls */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          {/* Area & Status */}
          <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white font-medium text-xs shadow-2xs">
              <MapPin className="w-3 h-3 text-emerald-200" />
              {spot.area}
            </span>

            {/* Closed Alert Badge if Permanently or Temporarily Closed */}
            {statusBadge.isAlert && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            )}
          </div>

          {/* Top-Right Action Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Visit Status Toggle Button */}
            <button
              type="button"
              id={`visit-toggle-card-${spot.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisited && onToggleVisited(spot.id, e);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 shadow-2xs ${
                spot.isVisited
                  ? 'bg-stone-900/90 text-white hover:bg-stone-900'
                  : 'bg-white/90 text-stone-800 hover:bg-white hover:text-[#2D4B3E]'
              }`}
              title={spot.isVisited ? '訪問済み（クリックで「行きたい」に変更）' : '行きたい（クリックで「行った」に変更）'}
            >
              {spot.isVisited ? (
                <>
                  <Check className="w-3 h-3 text-emerald-200 stroke-[3]" />
                  <span>行った</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3 h-3 stroke-[2]" />
                  <span>行きたい</span>
                </>
              )}
            </button>

            {/* Favorite Button */}
            <button
              type="button"
              id={`fav-btn-${spot.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(spot.id, e);
              }}
              className={`p-1.5 rounded-md backdrop-blur-md transition-all active:scale-90 shadow-2xs ${
                spot.isFavorite
                  ? 'bg-[#2D4B3E] text-white'
                  : 'bg-white/90 text-stone-700 hover:text-[#2D4B3E] hover:bg-white'
              }`}
              title={spot.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  spot.isFavorite ? 'fill-current' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Overlay inside Photo: Price & Genres */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-stone-200 text-[11px] font-medium">
            {spot.priceRange}
          </span>

          <div className="flex items-center gap-1 overflow-hidden">
            {spot.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-stone-200 text-[11px] font-medium"
              >
                {genre}
              </span>
            ))}
            {spot.genres.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-stone-300 text-[10px]">
                +{spot.genres.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-4.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Shop Title & Arrow */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-stone-900 leading-snug group-hover:text-[#2D4B3E] transition-colors line-clamp-1">
              {spot.name}
            </h2>
            <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-[#2D4B3E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
          </div>

          {/* Recommender Quote Card (Lemon8/BeReal style friend curation) */}
          <div className="mt-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200/70">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${avatar.bg} ${avatar.text}`}
                >
                  {avatar.initial}
                </span>
                <span className="text-[11px] font-semibold text-stone-700 truncate">
                  {spot.recommender}
                </span>
              </div>
              {spot.privateMemo && (
                <span
                  className="inline-flex items-center gap-0.5 text-stone-400 text-[10px]"
                  title="🔒 非公開メモあり"
                >
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-normal">
              「{spot.comment}」
            </p>
          </div>
        </div>

        {/* Bottom Scene & Folder Meta */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1 items-center justify-between">
          <div className="flex flex-wrap gap-1 items-center">
            {spot.folders && spot.folders.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1">
                <FolderOpen className="w-3 h-3 text-stone-500" />
                {spot.folders[0]}
                {spot.folders.length > 1 ? ` +${spot.folders.length - 1}` : ''}
              </span>
            )}
            {spot.scenes.map((scene) => (
              <span
                key={scene}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100/90 text-stone-700 border border-stone-200/80"
              >
                {scene}
              </span>
            ))}
          </div>
          {spot.isVisited && spot.visitedAt && (
            <span className="text-[10px] font-medium text-stone-500">
              {spot.visitedAt} 訪店
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
