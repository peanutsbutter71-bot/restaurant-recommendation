import React, { useState } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  MapPin,
  Tag,
  Wallet,
  Users2,
  ChevronDown,
  Bookmark,
  Heart,
  Filter,
  FolderOpen,
} from 'lucide-react';
import {
  FilterState,
  SortOption,
  PriceRange,
  Scene,
  COMMON_AREAS,
  COMMON_GENRES,
  ALL_SCENES,
  ALL_PRICE_RANGES,
  CustomFolder,
} from '../types';

interface FilterSortBarProps {
  filters: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  onResetFilters: () => void;
  availableAreas: string[];
  availableGenres: string[];
  availableFolders?: CustomFolder[];
  totalResultsCount: number;
  unvisitedCount: number;
  visitedCount: number;
  allCount: number;
}

export const FilterSortBar: React.FC<FilterSortBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableAreas,
  availableGenres,
  availableFolders = [],
  totalResultsCount,
  unvisitedCount,
  allCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine common areas/genres with any unique ones from data
  const allAreas = Array.from(new Set([...COMMON_AREAS, ...availableAreas]));
  const allGenres = Array.from(new Set([...COMMON_GENRES, ...availableGenres]));

  const isUnvisitedOnlyActive =
    filters.unvisitedOnly || filters.visitStatus === 'unvisited';

  // Count active filter conditions
  const activeFilterCount =
    filters.areas.length +
    filters.genres.length +
    filters.priceRanges.length +
    filters.scenes.length +
    ((filters.folders || []).length) +
    (filters.favoritesOnly ? 1 : 0) +
    (isUnvisitedOnlyActive ? 1 : 0) +
    (filters.visitStatus === 'visited' ? 1 : 0) +
    (filters.searchQuery.trim() ? 1 : 0);

  // Toggle Unvisited Only switch
  const handleToggleUnvisitedOnly = () => {
    onFilterChange((prev) => {
      const nextActive = !(prev.unvisitedOnly || prev.visitStatus === 'unvisited');
      return {
        ...prev,
        unvisitedOnly: nextActive,
        visitStatus: nextActive ? 'unvisited' : 'all',
      };
    });
  };

  // Toggle Favorites Only switch
  const handleToggleFavoritesOnly = () => {
    onFilterChange((prev) => ({
      ...prev,
      favoritesOnly: !prev.favoritesOnly,
    }));
  };

  const handleToggleArea = (area: string) => {
    onFilterChange((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }));
  };

  const handleToggleGenre = (genre: string) => {
    onFilterChange((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleTogglePriceRange = (range: PriceRange) => {
    onFilterChange((prev) => ({
      ...prev,
      priceRanges: prev.priceRanges.includes(range)
        ? prev.priceRanges.filter((r) => r !== range)
        : [...prev.priceRanges, range],
    }));
  };

  const handleToggleScene = (scene: Scene) => {
    onFilterChange((prev) => ({
      ...prev,
      scenes: prev.scenes.includes(scene)
        ? prev.scenes.filter((s) => s !== scene)
        : [...prev.scenes, scene],
    }));
  };

  const handleToggleFolder = (folderName: string) => {
    onFilterChange((prev) => {
      const current = prev.folders || [];
      return {
        ...prev,
        folders: current.includes(folderName)
          ? current.filter((f) => f !== folderName)
          : [...current, folderName],
      };
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top Controls Row: Switch Toggles & Match Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        {/* Toggle Switches Group */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
          {/* Unvisited Only Toggle */}
          <div
            id="toggle-unvisited-wrapper"
            onClick={handleToggleUnvisitedOnly}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
              isUnvisitedOnlyActive
                ? 'bg-stone-900 border-stone-900 text-white shadow-2xs'
                : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-stone-700'
            }`}
            title="まだ訪問していない行きたい店舗のみを表示します"
          >
            <div className="flex items-center gap-1.5">
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isUnvisitedOnlyActive ? 'text-orange-400 stroke-[2.5]' : 'text-stone-400'
                }`}
              />
              <span className="text-xs font-semibold whitespace-nowrap">
                未訪問のみ
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                  isUnvisitedOnlyActive
                    ? 'bg-stone-800 text-orange-300'
                    : 'bg-stone-200/70 text-stone-600'
                }`}
              >
                {unvisitedCount}
              </span>
            </div>

            {/* Switch knob */}
            <button
              type="button"
              id="switch-unvisited-only"
              role="switch"
              aria-checked={isUnvisitedOnlyActive}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleUnvisitedOnly();
              }}
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                isUnvisitedOnlyActive ? 'bg-orange-600' : 'bg-stone-300'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform ${
                  isUnvisitedOnlyActive ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Quick Favorite Only Switch */}
          <div
            id="toggle-favorite-wrapper"
            onClick={handleToggleFavoritesOnly}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
              filters.favoritesOnly
                ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-2xs font-semibold'
                : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200 text-stone-700'
            }`}
            title="お気に入りに追加した店舗のみを表示します"
          >
            <div className="flex items-center gap-1.5">
              <Heart
                className={`w-3.5 h-3.5 ${
                  filters.favoritesOnly
                    ? 'text-orange-600 fill-orange-600'
                    : 'text-stone-400'
                }`}
              />
              <span className="text-xs font-semibold whitespace-nowrap">
                お気に入りのみ
              </span>
            </div>

            {/* Switch knob */}
            <button
              type="button"
              id="switch-favorites-only"
              role="switch"
              aria-checked={filters.favoritesOnly}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavoritesOnly();
              }}
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                filters.favoritesOnly ? 'bg-orange-600' : 'bg-stone-300'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform ${
                  filters.favoritesOnly ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Match Count Indicator */}
        <div className="text-xs text-stone-500 font-medium flex items-center gap-1.5 ml-auto">
          <span>表示:</span>
          <span className="font-bold text-stone-900 text-sm">
            {totalResultsCount}
          </span>
          <span className="text-stone-400">/ 全{allCount}件</span>
        </div>
      </div>

      {/* Search Input & Sort & Expand Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-input"
            type="text"
            placeholder="店名、エリア、おすすめした人、特徴で検索..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            className="w-full pl-10 pr-9 py-2 bg-stone-50 hover:bg-stone-100/50 focus:bg-white border border-stone-200 rounded-lg text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {filters.searchQuery && (
            <button
              id="clear-search-btn"
              onClick={() => onFilterChange((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-md"
              title="検索クリア"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[150px] sm:min-w-[170px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SortOption,
                }))
              }
              className="w-full pl-8 pr-8 py-2 bg-stone-50 hover:bg-stone-100/70 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer transition-all"
            >
              <option value="newest">追加日時：新しい順</option>
              <option value="oldest">追加日時：古い順</option>
              <option value="priceAsc">価格帯：安い順</option>
              <option value="priceDesc">価格帯：高い順</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Toggle Detailed Filter Panel button */}
          <button
            id="toggle-filter-panel-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isExpanded ||
              filters.areas.length > 0 ||
              filters.genres.length > 0 ||
              filters.priceRanges.length > 0
                ? 'bg-stone-900 border-stone-900 text-white shadow-2xs'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>詳細絞り込み</span>
            {filters.areas.length + filters.genres.length + filters.priceRanges.length > 0 && (
              <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-orange-600 text-white rounded">
                {filters.areas.length + filters.genres.length + filters.priceRanges.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Scene Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-400 text-xs font-semibold whitespace-nowrap mr-1 flex items-center gap-1">
          <Users2 className="w-3 h-3" />
          シーン:
        </span>
        {ALL_SCENES.map((scene) => {
          const isSelected = filters.scenes.includes(scene);
          return (
            <button
              key={scene}
              id={`quick-scene-${scene}`}
              onClick={() => handleToggleScene(scene)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white font-bold shadow-2xs'
                  : 'bg-stone-100 text-stone-700 border border-stone-200/80 hover:bg-stone-200/80'
              }`}
            >
              {scene}
            </button>
          );
        })}
      </div>

      {/* Expandable Filter Details (Price, Area, Genre, Folders) */}
      {isExpanded && (
        <div className="pt-3 border-t border-stone-100 space-y-3.5">
          {/* Price Range Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <Wallet className="w-3.5 h-3.5 text-stone-500" />
              <span>予算・価格帯</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PRICE_RANGES.map((price) => {
                const isSelected = filters.priceRanges.includes(price);
                return (
                  <button
                    key={price}
                    id={`filter-price-${price}`}
                    onClick={() => handleTogglePriceRange(price)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200/70'
                    }`}
                  >
                    {price}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              <span>エリア</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {allAreas.map((area) => {
                const isSelected = filters.areas.includes(area);
                return (
                  <button
                    key={area}
                    id={`filter-area-${area}`}
                    onClick={() => handleToggleArea(area)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200/70'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <Tag className="w-3.5 h-3.5 text-stone-500" />
              <span>ジャンル</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {allGenres.map((genre) => {
                const isSelected = filters.genres.includes(genre);
                return (
                  <button
                    key={genre}
                    id={`filter-genre-${genre}`}
                    onClick={() => handleToggleGenre(genre)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200/70'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folder Filter (if available) */}
          {availableFolders.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                <FolderOpen className="w-3.5 h-3.5 text-stone-500" />
                <span>フォルダ / リスト</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableFolders.map((folder) => {
                  const isSelected = (filters.folders || []).includes(folder.name);
                  return (
                    <button
                      key={folder.id}
                      id={`filter-folder-${folder.id}`}
                      onClick={() => handleToggleFolder(folder.name)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/80'
                      }`}
                    >
                      {folder.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      <div
        id="active-filters-container"
        className="pt-2 border-t border-stone-100"
      >
        {activeFilterCount > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-stone-50 p-2.5 sm:p-3 rounded-xl border border-stone-200/70">
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3 h-3 text-stone-600" />
                選択中 ({activeFilterCount}):
              </span>

              {/* Search keyword chip */}
              {filters.searchQuery.trim() && (
                <span
                  id="active-chip-search"
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <Search className="w-3 h-3 text-stone-400" />
                  <span className="truncate max-w-[120px]">
                    &quot;{filters.searchQuery}&quot;
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({ ...prev, searchQuery: '' }))
                    }
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title="検索条件を解除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Unvisited only chip */}
              {isUnvisitedOnlyActive && (
                <span
                  id="active-chip-unvisited"
                  className="inline-flex items-center gap-1 bg-stone-900 text-white px-2 py-0.5 rounded-md text-xs font-semibold shadow-2xs"
                >
                  <Bookmark className="w-3 h-3 text-orange-400" />
                  <span>未訪問のみ</span>
                  <button
                    type="button"
                    onClick={handleToggleUnvisitedOnly}
                    className="text-stone-300 hover:text-white cursor-pointer p-0.5"
                    title="未訪問のみ解除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Favorites only chip */}
              {filters.favoritesOnly && (
                <span
                  id="active-chip-favorites"
                  className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-200 text-xs font-semibold shadow-2xs"
                >
                  <Heart className="w-3 h-3 text-orange-600 fill-orange-600" />
                  <span>お気に入りのみ</span>
                  <button
                    type="button"
                    onClick={handleToggleFavoritesOnly}
                    className="text-orange-600 hover:text-orange-950 cursor-pointer p-0.5"
                    title="お気に入りのみ解除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Areas */}
              {filters.areas.map((area) => (
                <span
                  key={`active-area-${area}`}
                  id={`active-chip-area-${area}`}
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-stone-400" />
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleArea(area)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title={`${area}を解除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Genres */}
              {filters.genres.map((genre) => (
                <span
                  key={`active-genre-${genre}`}
                  id={`active-chip-genre-${genre}`}
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-stone-400" />
                  <span>{genre}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleGenre(genre)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title={`${genre}を解除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Prices */}
              {filters.priceRanges.map((price) => (
                <span
                  key={`active-price-${price}`}
                  id={`active-chip-price-${price}`}
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <Wallet className="w-3 h-3 text-stone-400" />
                  <span>{price}</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePriceRange(price)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title={`${price}を解除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Folders */}
              {(filters.folders || []).map((folderName) => (
                <span
                  key={`active-folder-${folderName}`}
                  id={`active-chip-folder-${folderName}`}
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <FolderOpen className="w-3 h-3 text-stone-400" />
                  <span>{folderName}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleFolder(folderName)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title={`${folderName}を解除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Scenes */}
              {filters.scenes.map((scene) => (
                <span
                  key={`active-scene-${scene}`}
                  id={`active-chip-scene-${scene}`}
                  className="inline-flex items-center gap-1 bg-white text-stone-800 px-2 py-0.5 rounded-md border border-stone-200 text-xs font-medium shadow-2xs"
                >
                  <Users2 className="w-3 h-3 text-stone-400" />
                  <span>{scene}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleScene(scene)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                    title={`${scene}を解除`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Clear All Filters Button */}
            <button
              id="reset-all-filters-btn"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200 text-xs font-semibold transition-all cursor-pointer self-end sm:self-auto shrink-0 shadow-2xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>条件クリア</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-stone-400 py-0.5 px-1">
            <span className="text-[11px]">
              すべての店舗を表示中
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
