import React from 'react';
import {
  Heart,
  MapPin,
  Sparkles,
  ArrowUpRight,
  Check,
  Bookmark,
  UtensilsCrossed,
  Map,
  Lock,
  FolderOpen,
} from 'lucide-react';
import { RestaurantSpot } from '../types';
import {
  PRICE_COLORS,
  generateRecommenderAvatar,
  getOptimizedImageUrl,
} from '../utils/helpers';
import { getOperatingStatusBadge } from '../utils/aiStatusCheck';

interface SpotListItemProps {
  spot: RestaurantSpot;
  onSelect: (spot: RestaurantSpot) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onToggleVisited?: (id: string, e: React.MouseEvent) => void;
}

export const SpotListItem: React.FC<SpotListItemProps> = ({
  spot,
  onSelect,
  onToggleFavorite,
  onToggleVisited,
}) => {
  const avatar = generateRecommenderAvatar(spot.recommender);
  const statusBadge = getOperatingStatusBadge(spot.operatingStatus);
  const optimizedThumbnailUrl = getOptimizedImageUrl(spot.imageUrl, 320);

  return (
    <div
      id={`spot-list-item-${spot.id}`}
      onClick={() => onSelect(spot)}
      className={`group bg-white rounded-xl border p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex items-center gap-3 sm:gap-4 cursor-pointer ${
        statusBadge.isAlert
          ? 'border-red-300 bg-red-50/10'
          : 'border-stone-200/90 hover:border-stone-400'
      }`}
    >
      {/* Compact Thumbnail (80px - 96px) */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60">
        <img
          src={optimizedThumbnailUrl}
          alt={spot.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />

        {/* Visit Status mini overlay badge */}
        <div className="absolute top-1 left-1 flex flex-col gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold backdrop-blur-md shadow-2xs ${
              spot.isVisited
                ? 'bg-stone-900/90 text-white'
                : 'bg-white/90 text-stone-800'
            }`}
          >
            {spot.isVisited ? '済' : '未訪'}
          </span>
          {statusBadge.isAlert && (
            <span
              className={`px-1 py-0.5 rounded text-[8px] font-bold shadow-2xs ${statusBadge.bg} ${statusBadge.text}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Main Info Columns */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1.5">
        {/* Row 1: Area, Price, Genres & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Area Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-semibold text-[11px]">
              <MapPin className="w-2.5 h-2.5 text-[#2D4B3E]" />
              {spot.area}
              {spot.nearestStation && ` ／ ${spot.nearestStation}`}
            </span>

            {/* Price badge */}
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200/60">
              {spot.priceRange}
            </span>

            {/* First Genre */}
            {spot.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="hidden xs:inline-block px-1.5 py-0.5 rounded-md bg-stone-50 text-stone-600 border border-stone-200/60 text-[10px] font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Quick Action buttons: Visit & Favorite */}
          <div className="flex items-center gap-1 shrink-0">
            {spot.privateMemo && (
              <span
                className="p-1 rounded-md bg-stone-100 text-stone-600"
                title="🔒 非公開メモあり"
              >
                <Lock className="w-3 h-3 text-stone-500" />
              </span>
            )}
            <button
              type="button"
              id={`list-visit-toggle-${spot.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisited && onToggleVisited(spot.id, e);
              }}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-[11px] font-semibold transition-all border active:scale-95 cursor-pointer flex items-center gap-1 ${
                spot.isVisited
                  ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
              title={spot.isVisited ? '訪問済み（クリックで「行きたい」に変更）' : '行きたい（クリックで「行った」に変更）'}
            >
              {spot.isVisited ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200 stroke-[3]" />
                  <span className="hidden md:inline">行った</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden md:inline">行きたい</span>
                </>
              )}
            </button>

            <button
              type="button"
              id={`list-fav-btn-${spot.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(spot.id, e);
              }}
              className={`p-1.5 rounded-md transition-all border active:scale-90 cursor-pointer ${
                spot.isFavorite
                  ? 'bg-[#E8ECE8] text-[#2D4B3E] border-[#C5D8C5] hover:bg-[#D8ECD8]'
                  : 'bg-white text-stone-400 border-stone-200 hover:text-[#2D4B3E] hover:bg-stone-50'
              }`}
              title={spot.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  spot.isFavorite ? 'fill-current text-[#2D4B3E]' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Row 2: Shop Name & Highlight Dish */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-[#2D4B3E] transition-colors truncate">
              {spot.name}
            </h3>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#2D4B3E] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

        </div>

        {/* Row 3: Recommender & Comment preview */}
        <div className="flex items-center gap-2 text-xs text-stone-600 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${avatar.bg} ${avatar.text}`}
            >
              {avatar.initial}
            </span>
            <span className="font-semibold text-stone-700 text-[11px] truncate max-w-[100px] sm:max-w-[140px]">
              {spot.recommender}
            </span>
          </div>

          <span className="text-stone-300">|</span>

          <p className="text-[11px] text-stone-500 truncate">
            「{spot.comment}」
          </p>
        </div>

        {/* Row 4: Scene & Folder Tags & External Map Links */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-100 gap-2">
          <div className="flex items-center gap-1 overflow-hidden flex-wrap">
            {spot.folders && spot.folders.length > 0 && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-0.5">
                <FolderOpen className="w-2.5 h-2.5 text-stone-500" />
                {spot.folders[0]}
              </span>
            )}
            {spot.scenes.slice(0, 3).map((scene) => (
              <span
                key={scene}
                className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-700 border border-stone-200/70"
              >
                {scene}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-medium text-stone-400">
            {spot.mapUrl && (
              <a
                href={spot.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-stone-900 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-50 hover:bg-stone-100 border border-stone-200/60 transition-colors"
                title="Googleマップを開く"
              >
                <Map className="w-2.5 h-2.5 text-stone-500" />
                <span>Map</span>
              </a>
            )}
            {spot.tabelogUrl && (
              <a
                href={spot.tabelogUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-stone-900 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-stone-50 hover:bg-stone-100 border border-stone-200/60 text-stone-700 transition-colors"
                title="食べログを開く"
              >
                <UtensilsCrossed className="w-2.5 h-2.5 text-[#2D4B3E]" />
                <span>食べログ</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
