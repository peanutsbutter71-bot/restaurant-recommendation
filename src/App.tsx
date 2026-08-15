import React, { useState, useEffect, useMemo } from 'react';
import {
  RestaurantSpot,
  FilterState,
  SortOption,
  PRICE_ORDER,
  PriceRange,
  Scene,
  CustomFolder,
  MainTab,
  SwipeDirection,
  UserPreferenceScores,
} from './types';
import { INITIAL_SPOTS } from './data/initialSpots';
import { Header } from './components/Header';
import { FilterSortBar } from './components/FilterSortBar';
import { SpotCard } from './components/SpotCard';
import { SpotListItem } from './components/SpotListItem';
import { SpotMiniMapView } from './components/SpotMiniMapView';
import { SpotDetailModal } from './components/SpotDetailModal';
import { AddEditSpotModal } from './components/AddEditSpotModal';
import { RandomRouletteModal } from './components/RandomRouletteModal';
import { QuickUrlImportModal } from './components/QuickUrlImportModal';
import { MyPageModal } from './components/MyPageModal';
import { DiscoverSwipeView } from './components/DiscoverSwipeView';
import { ShareAppModal } from './components/ShareAppModal';
import { StarterPackModal } from './components/StarterPackModal';
import { BulkUrlImportModal } from './components/BulkUrlImportModal';
import { StarterPack } from './data/starterPacks';
import { Toast } from './components/Toast';
import {
  INITIAL_PREFERENCES,
  updatePreferencesWithSwipe,
} from './utils/swipePreferences';
import {
  extractShareTargetParamsFromUrl,
  clearShareParamsFromUrl,
  parseSharedUrlOrText,
} from './utils/aiShareImport';
import {
  Sparkles,
  Plus,
  Compass,
  Heart,
  Store,
  ChefHat,
  SearchX,
  RotateCcw,
  MapPin,
  LayoutGrid,
  List,
  Map,
  Share2,
  Clipboard,
  Utensils,
  Flame,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'gourmet_share_spots_v1';
const DISPLAY_MODE_STORAGE_KEY = 'gourmet_share_display_mode_v1';
const FOLDERS_STORAGE_KEY = 'gourmet_share_folders_v1';
const PRIVACY_STORAGE_KEY = 'gourmet_share_hide_private_v1';
const PREFERENCES_STORAGE_KEY = 'gourmet_share_preferences_v1';
const MAIN_TAB_STORAGE_KEY = 'gourmet_share_main_tab_v1';

const DEFAULT_FOLDERS: CustomFolder[] = [
  { id: 'f-date', name: 'デート・記念日', color: '#f43f5e', createdAt: '2025-01-01' },
  { id: 'f-lunch', name: 'ご褒美ランチ', color: '#f59e0b', createdAt: '2025-01-01' },
  { id: 'f-coffee', name: '作業カフェ', color: '#3b82f6', createdAt: '2025-01-01' },
  { id: 'f-group', name: '歓送迎会・大人数', color: '#10b981', createdAt: '2025-01-01' },
];

export default function App() {
  // State for all restaurant spots with LocalStorage backup
  const [spots, setSpots] = useState<RestaurantSpot[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load spots from storage', e);
    }
    return INITIAL_SPOTS;
  });

  // State for Custom Folders
  const [folders, setFolders] = useState<CustomFolder[]>(() => {
    try {
      const saved = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load folders from storage', e);
    }
    return DEFAULT_FOLDERS;
  });

  // Main Navigation Tab: 'list' (従来の一覧/マップ) vs 'discover' (Tinder風スワイプ発見)
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    try {
      const saved = localStorage.getItem(MAIN_TAB_STORAGE_KEY);
      if (saved === 'list' || saved === 'discover') return saved;
    } catch (e) {
      // fallback
    }
    return 'list';
  });

  // User Preference Scores for Swipe Discovery Learning
  const [preferenceScores, setPreferenceScores] = useState<UserPreferenceScores>(() => {
    try {
      const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load swipe preferences from storage', e);
    }
    return INITIAL_PREFERENCES;
  });

  // Privacy: Hide private notes mode (e.g. when showing screen to friends)
  const [hidePrivateMemo, setHidePrivateMemo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return false;
  });

  // Filters and sorting state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    areas: [],
    genres: [],
    priceRanges: [],
    scenes: [],
    folders: [],
    favoritesOnly: false,
    unvisitedOnly: false,
    visitStatus: 'all',
    sortBy: 'newest',
  });

  // View mode: 'both' (Map + Grid/List), 'grid' (List/Cards only), 'map' (Map focused)
  const [viewMode, setViewMode] = useState<'both' | 'grid' | 'map'>('both');
  
  // Card Display Mode: 'list' (コンパクトリスト) vs 'card' (大カード写真重視)
  const [cardDisplayMode, setCardDisplayMode] = useState<'list' | 'card'>(() => {
    try {
      const saved = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
      if (saved === 'list' || saved === 'card') return saved;
    } catch (e) {
      // fallback
    }
    return 'list'; // Default to compact list for fast browsing & less scrolling
  });

  const [activeMapSpotId, setActiveMapSpotId] = useState<string | null>(null);

  // Active modals
  const [selectedSpot, setSelectedSpot] = useState<RestaurantSpot | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<RestaurantSpot | Partial<RestaurantSpot> | null>(null);
  const [isAiPrefilled, setIsAiPrefilled] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isStarterModalOpen, setIsStarterModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [importedPackIds, setImportedPackIds] = useState<string[]>([]);
  const [quickImportInitialText, setQuickImportInitialText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBatchImportSpots = (newSpots: Partial<RestaurantSpot>[], folderName?: string) => {
    if (!newSpots || newSpots.length === 0) return;

    if (folderName && !folders.some((f) => f.name.toLowerCase() === folderName.toLowerCase())) {
      const newFolder: CustomFolder = {
        id: `folder-${Date.now()}`,
        name: folderName,
        color: 'orange',
        createdAt: new Date().toISOString(),
      };
      setFolders((prev) => [...prev, newFolder]);
    }

    const nowIso = new Date().toISOString();
    const createdSpots: RestaurantSpot[] = newSpots.map((s, idx) => ({
      id: `spot-bulk-${Date.now()}-${idx}`,
      name: s.name || '無題の店舗',
      area: s.area || '都内',
      genres: s.genres && s.genres.length > 0 ? s.genres : ['カフェ・喫茶'],
      priceRange: s.priceRange || '1000〜3000円',
      scenes: s.scenes && s.scenes.length > 0 ? s.scenes : ['女子会'],
      recommender: s.recommender || '一括インポート',
      comment: s.comment || '一括登録された店舗',
      mapUrl: s.mapUrl,
      tabelogUrl: s.tabelogUrl,
      imageUrl: s.imageUrl,
      createdAt: nowIso,
      isFavorite: false,
      isVisited: false,
      folders: folderName ? [folderName] : s.folders || [],
    }));

    setSpots((prev) => [...createdSpots, ...prev]);
    showToast(`✨ ${createdSpots.length}件の店舗を一括追加しました！`);
  };

  const handleImportStarterPack = (pack: StarterPack) => {
    // 1. Ensure custom folder exists
    const existingFolder = folders.find((f) => f.name.toLowerCase() === pack.folderName.toLowerCase());

    if (!existingFolder) {
      const newFolder: CustomFolder = {
        id: `folder-pack-${Date.now()}`,
        name: pack.folderName,
        color: pack.folderColor || '#f43f5e',
        createdAt: new Date().toISOString(),
      };
      setFolders((prev) => [...prev, newFolder]);
    }

    // 2. Map pack spots to RestaurantSpot instances with custom folder
    const nowIso = new Date().toISOString();
    const newSpotsToInsert: RestaurantSpot[] = pack.spots.map((spotTemplate, idx) => ({
      ...spotTemplate,
      id: `spot-pack-${Date.now()}-${idx}`,
      createdAt: nowIso,
      folders: [pack.folderName],
    }));

    setSpots((prev) => [...newSpotsToInsert, ...prev]);
    setImportedPackIds((prev) => Array.from(new Set([...prev, pack.id])));
    showToast(`🎉 「📁 ${pack.folderName}」フォルダに ${pack.spots.length}店舗 を保存しました！`);
  };

  // Inline Quick Import input in hero/banner
  const [heroInputUrl, setHeroInputUrl] = useState('');
  const [isHeroAnalyzing, setIsHeroAnalyzing] = useState(false);

  // Sync spots to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spots));
    } catch (e) {
      console.error('Failed to save spots to storage', e);
    }
  }, [spots]);

  // Sync folders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to storage', e);
    }
  }, [folders]);

  // Sync privacy mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(hidePrivateMemo));
    } catch (e) {
      console.error('Failed to save privacy mode to storage', e);
    }
  }, [hidePrivateMemo]);

  // Sync mainTab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MAIN_TAB_STORAGE_KEY, mainTab);
    } catch (e) {
      console.error('Failed to save main tab to storage', e);
    }
  }, [mainTab]);

  // Sync preferenceScores to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferenceScores));
    } catch (e) {
      console.error('Failed to save swipe preferences to storage', e);
    }
  }, [preferenceScores]);

  // Swipe Action Handler (Like/Superlike adds to Want-to-go, Superlike adds favorite, updates score)
  const handleSpotSwipe = (spot: RestaurantSpot, direction: SwipeDirection) => {
    // 1. Update preference scores
    setPreferenceScores((prev) => updatePreferencesWithSwipe(prev, spot, direction));

    // 2. Automatically update spot list according to user intent
    if (direction === 'right') {
      // Like -> Mark as Want-to-go (isVisited: false)
      setSpots((prev) =>
        prev.map((s) => (s.id === spot.id ? { ...s, isVisited: false } : s))
      );
    } else if (direction === 'up') {
      // Superlike -> Mark as Favorite AND Want-to-go
      setSpots((prev) =>
        prev.map((s) => (s.id === spot.id ? { ...s, isFavorite: true, isVisited: false } : s))
      );
    }
  };

  const handleResetSwipePreferences = () => {
    setPreferenceScores(INITIAL_PREFERENCES);
    try {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch (e) {
      // fallback
    }
  };

  // Folder Management Handlers
  const handleAddFolder = (name: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (folders.some((f) => f.name === trimmed)) {
      showToast(`「${trimmed}」は既に存在します`);
      return;
    }
    const newFolder: CustomFolder = {
      id: `folder-${Date.now()}`,
      name: trimmed,
      color: color || '#f43f5e',
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, newFolder]);
    showToast(`📁 フォルダ「${trimmed}」を作成しました`);
  };

  const handleDeleteFolder = (folderId: string) => {
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    // Remove deleted folder tag from spots
    setSpots((prev) =>
      prev.map((s) => ({
        ...s,
        folders: s.folders?.filter((fn) => fn !== target.name),
      }))
    );
    showToast(`フォルダ「${target.name}」を削除しました`);
  };

  const handleToggleShareFolder = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, isShared: true } : f))
    );
  };

  // Full App Data Restore Handler
  const handleRestoreData = (newSpots: RestaurantSpot[], newFolders?: CustomFolder[]) => {
    setSpots(newSpots);
    if (newFolders && newFolders.length > 0) {
      setFolders(newFolders);
    }
    showToast(`✨ バックアップから${newSpots.length}件のお店データを復元しました！`);
  };

  // Handle incoming Web Share Target (from OS share menu)
  useEffect(() => {
    const shareData = extractShareTargetParamsFromUrl();
    if (shareData.hasShareData) {
      clearShareParamsFromUrl();
      showToast('📱 共有リンクを受け取りました！AI解析を開始します...');
      // Open Quick Import Modal with the prefilled text
      setQuickImportInitialText(shareData.combined);
      setIsQuickImportOpen(true);
    }
  }, []);

  // Handler to update card display mode with local storage persistence
  const handleSetCardDisplayMode = (mode: 'list' | 'card') => {
    setCardDisplayMode(mode);
    try {
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
    } catch (e) {
      // fallback
    }
  };

  // Toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3200);
  };

  // Handler when AI successfully parses a shared URL
  const handleSuccessParsedFromShare = (prefilledSpot: Partial<RestaurantSpot>) => {
    setEditingSpot(prefilledSpot);
    setIsAiPrefilled(true);
    setIsAddModalOpen(true);
  };

  // Quick Analyze from Hero input
  const handleHeroAnalyze = async () => {
    if (!heroInputUrl.trim()) return;
    setIsHeroAnalyzing(true);
    try {
      showToast('✨ AIが店舗情報を自動検索中...');
      const result = await parseSharedUrlOrText(heroInputUrl.trim());
      if (result.spot) {
        handleSuccessParsedFromShare(result.spot);
        setHeroInputUrl('');
      } else {
        showToast('店舗情報の解析に失敗しました。URLをご確認ください。');
      }
    } catch (err: any) {
      console.error('Hero analyze error:', err);
      showToast('URLの解析に失敗しました。');
    } finally {
      setIsHeroAnalyzing(false);
    }
  };

  // Paste from clipboard to Hero input
  const handleHeroPaste = async () => {
    try {
      if (!navigator.clipboard) {
        showToast('クリップボードの読み取りに対応していないブラウザです');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setHeroInputUrl(text);
        showToast('クリップボードから貼り付けました📋');
      }
    } catch {
      showToast('クリップボードへのアクセスが許可されていません');
    }
  };

  // Toggle favorite for a spot
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSpots((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = !s.isFavorite;
          showToast(
            updated ? `「${s.name}」をお気に入りに追加しました 💕` : `「${s.name}」をお気に入り解除しました`
          );
          return { ...s, isFavorite: updated };
        }
        return s;
      })
    );

    // Keep selectedSpot in sync if opened
    if (selectedSpot && selectedSpot.id === id) {
      setSelectedSpot((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  // Toggle visited status for a spot
  const handleToggleVisited = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSpots((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextVisited = !s.isVisited;
          const today = new Date().toISOString().split('T')[0];
          showToast(
            nextVisited
              ? `「${s.name}」を「行った店舗」に記録しました 🎉`
              : `「${s.name}」を「行きたい店舗」に戻しました 🔖`
          );
          return {
            ...s,
            isVisited: nextVisited,
            visitedAt: nextVisited ? (s.visitedAt || today) : s.visitedAt,
          };
        }
        return s;
      })
    );

    // Keep selectedSpot in sync if opened
    if (selectedSpot && selectedSpot.id === id) {
      setSelectedSpot((prev) =>
        prev
          ? {
              ...prev,
              isVisited: !prev.isVisited,
              visitedAt: !prev.isVisited ? (prev.visitedAt || new Date().toISOString().split('T')[0]) : prev.visitedAt,
            }
          : null
      );
    }
  };

  // Save new spot or update existing spot
  const handleSaveSpot = (newSpot: RestaurantSpot) => {
    setSpots((prev) => {
      const exists = prev.some((s) => s.id === newSpot.id);
      if (exists) {
        return prev.map((s) => (s.id === newSpot.id ? newSpot : s));
      }
      return [newSpot, ...prev];
    });

    setIsAddModalOpen(false);
    setEditingSpot(null);
    setSelectedSpot(newSpot);
    showToast(editingSpot ? 'お店情報を更新しました✨' : '新しいお店を記録しました🎉');
  };

  // Delete spot
  const handleDeleteSpot = (id: string) => {
    const spotToDelete = spots.find((s) => s.id === id);
    setSpots((prev) => prev.filter((s) => s.id !== id));
    setSelectedSpot(null);
    showToast(`「${spotToDelete?.name || 'お店'}」を削除しました`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      areas: [],
      genres: [],
      priceRanges: [],
      scenes: [],
      favoritesOnly: false,
      unvisitedOnly: false,
      visitStatus: 'all',
      sortBy: 'newest',
    });
    showToast('絞り込み条件をリセットしました');
  };

  // Derived available areas and genres for filter chips
  const availableAreas = useMemo(() => {
    return Array.from(new Set(spots.map((s) => s.area))).filter(Boolean);
  }, [spots]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => s.genres.forEach((g) => set.add(g)));
    return Array.from(set).filter(Boolean);
  }, [spots]);

  // Counts for visit status
  const unvisitedCount = useMemo(() => spots.filter((s) => !s.isVisited).length, [spots]);
  const visitedCount = useMemo(() => spots.filter((s) => s.isVisited).length, [spots]);

  // Combined Filter + Search + Sort Logic
  const filteredAndSortedSpots = useMemo(() => {
    let result = [...spots];

    // 1. Keyword search (Name & Comment & Recommender & Highlight)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.comment.toLowerCase().includes(query) ||
          s.recommender.toLowerCase().includes(query) ||
          (s.highlightDish && s.highlightDish.toLowerCase().includes(query)) ||
          s.area.toLowerCase().includes(query) ||
          s.genres.some((g) => g.toLowerCase().includes(query))
      );
    }

    // 2. Favorites only
    if (filters.favoritesOnly) {
      result = result.filter((s) => s.isFavorite);
    }

    // 3. Visit status / Unvisited only filter
    if (filters.unvisitedOnly || filters.visitStatus === 'unvisited') {
      result = result.filter((s) => !s.isVisited);
    } else if (filters.visitStatus === 'visited') {
      result = result.filter((s) => s.isVisited);
    }

    // 4. Filter by Areas (Multi-select)
    if (filters.areas.length > 0) {
      result = result.filter((s) => filters.areas.includes(s.area));
    }

    // 5. Filter by Genres (Multi-select: at least one match)
    if (filters.genres.length > 0) {
      result = result.filter((s) =>
        s.genres.some((g) => filters.genres.includes(g))
      );
    }

    // 6. Filter by Price Ranges (Multi-select)
    if (filters.priceRanges.length > 0) {
      result = result.filter((s) => filters.priceRanges.includes(s.priceRange));
    }

    // 7. Filter by Scenes (Multi-select: at least one match)
    if (filters.scenes.length > 0) {
      result = result.filter((s) =>
        s.scenes.some((sc) => filters.scenes.includes(sc))
      );
    }

    // 8. Filter by Custom Folders (Multi-select: at least one match)
    if (filters.folders && filters.folders.length > 0) {
      result = result.filter((s) =>
        s.folders && s.folders.some((f) => filters.folders!.includes(f))
      );
    }

    // 9. Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (filters.sortBy === 'priceAsc') {
        const orderDiff = PRICE_ORDER[a.priceRange] - PRICE_ORDER[b.priceRange];
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sortBy === 'priceDesc') {
        const orderDiff = PRICE_ORDER[b.priceRange] - PRICE_ORDER[a.priceRange];
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [spots, filters]);

  const favoriteCount = spots.filter((s) => s.isFavorite).length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col">
      {/* Sticky Header */}
      <Header
        spotCount={spots.length}
        favoriteCount={favoriteCount}
        activeTab={mainTab}
        onTabChange={setMainTab}
        onOpenAddModal={() => {
          setEditingSpot(null);
          setIsAiPrefilled(false);
          setIsAddModalOpen(true);
        }}
        onOpenQuickImport={() => {
          setQuickImportInitialText('');
          setIsQuickImportOpen(true);
        }}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onOpenRandomModal={() => setIsRandomModalOpen(true)}
        onOpenMyPage={() => setIsMyPageOpen(true)}
        onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
        favoritesOnly={filters.favoritesOnly}
        onToggleFavoritesOnly={() =>
          setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))
        }
      />

      {/* Main Content Area: Switch between 'discover' (Tinder Swipe) and 'list' (Classic List/Map) */}
      {mainTab === 'discover' ? (
        <main className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-5 flex-1 w-full animate-in fade-in duration-300">
          <DiscoverSwipeView
            allSpots={spots}
            preferenceScores={preferenceScores}
            onSwipe={handleSpotSwipe}
            onResetPreferences={handleResetSwipePreferences}
            onSelectSpot={(spot) => setSelectedSpot(spot)}
            onSwitchToListTab={() => setMainTab('list')}
            onShowToast={showToast}
          />
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 flex-1 w-full space-y-5 animate-in fade-in duration-200">
          {/* Quick URL / Share Import Hero Bar */}
          <div className="bg-gradient-to-r from-slate-900/5 via-amber-500/10 to-orange-500/10 p-4 sm:p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-900 via-zinc-800 to-amber-600 flex items-center justify-center text-amber-300 shadow-xs">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>共有URLからAI一発登録</span>
                  <span className="text-[10px] bg-slate-900 text-amber-300 px-2 py-0.2 rounded-full font-bold">
                    食べログ・Googleマップ・Instagram
                  </span>
                </h3>
                <p className="text-[11px] text-stone-500 hidden sm:block">
                  リンクを貼るだけで、店名・エリア・ジャンル・予算をAIが自動抽出して記録できます
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuickImportInitialText('');
                setIsQuickImportOpen(true);
              }}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 self-end sm:self-auto cursor-pointer"
            >
              <span>詳しい使い方・PWA共有ガイド</span>
            </button>
          </div>

          {/* Quick Input Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                id="hero-quick-url-input"
                type="text"
                placeholder="食べログ、Googleマップ、InstagramのURLまたは共有文を貼り付け..."
                value={heroInputUrl}
                onChange={(e) => setHeroInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleHeroAnalyze();
                  }
                }}
                className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-xs"
              />
              <button
                type="button"
                onClick={handleHeroPaste}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-stone-600 hover:text-amber-800 bg-stone-100 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="クリップボードから貼り付け"
              >
                <Clipboard className="w-3 h-3" />
                <span>貼付</span>
              </button>
            </div>

            <button
              id="hero-quick-analyze-btn"
              type="button"
              onClick={handleHeroAnalyze}
              disabled={isHeroAnalyzing || !heroInputUrl.trim()}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                isHeroAnalyzing
                  ? 'bg-amber-200 text-amber-800 cursor-wait'
                  : !heroInputUrl.trim()
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-900 to-zinc-900 hover:from-amber-600 hover:to-orange-600 text-white active:scale-95 shadow-slate-900/10'
              }`}
            >
              {isHeroAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                  <span>AI解析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AIで一発登録</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <FilterSortBar
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetFilters}
          availableAreas={availableAreas}
          availableGenres={availableGenres}
          availableFolders={folders}
          totalResultsCount={filteredAndSortedSpots.length}
          unvisitedCount={unvisitedCount}
          visitedCount={visitedCount}
          allCount={spots.length}
        />

        {/* View Mode & Card Layout Switcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Left: Overall View Mode (Map+List / List Only / Map Only) */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold flex-wrap">
            <span className="hidden sm:inline">表示:</span>
            <div className="inline-flex p-1 bg-stone-200/70 rounded-2xl border border-stone-200">
              <button
                type="button"
                id="view-mode-both"
                onClick={() => setViewMode('both')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'both'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="地図と一覧の両方を表示"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>マップ＋一覧</span>
              </button>

              <button
                type="button"
                id="view-mode-grid"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="一覧のみ表示"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                <span>一覧のみ</span>
              </button>

              <button
                type="button"
                id="view-mode-map"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="マップをフル表示"
              >
                <Map className="w-3.5 h-3.5 text-rose-500" />
                <span>マップ専従</span>
              </button>
            </div>
          </div>

          {/* Right: Card Display Style Toggle (Compact List vs Big Photo Card) */}
          {viewMode !== 'map' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] font-bold text-stone-400">
                カード形式:
              </span>
              <div className="inline-flex p-0.5 bg-stone-200/80 rounded-xl border border-stone-200">
                <button
                  type="button"
                  id="card-display-list-btn"
                  onClick={() => handleSetCardDisplayMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cardDisplayMode === 'list'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="スクロールが短く一覧しやすいコンパクトリスト"
                >
                  <List className="w-3.5 h-3.5 text-rose-500" />
                  <span>リスト（省スペース）</span>
                </button>

                <button
                  type="button"
                  id="card-display-card-btn"
                  onClick={() => handleSetCardDisplayMode('card')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cardDisplayMode === 'card'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="写真を大きく見せるカード"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                  <span>写真カード</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mini Map View Section (when viewMode is 'both' or 'map') */}
        {(viewMode === 'both' || viewMode === 'map') && filteredAndSortedSpots.length > 0 && (
          <div className="animate-in fade-in duration-200">
            <SpotMiniMapView
              spots={filteredAndSortedSpots}
              selectedSpotId={activeMapSpotId}
              onSelectSpot={(spot) => {
                setSelectedSpot(spot);
                setActiveMapSpotId(spot.id);
              }}
              onToggleFavorite={handleToggleFavorite}
              onToggleVisited={handleToggleVisited}
            />
          </div>
        )}

        {/* Spots List / Grid View (when viewMode is 'both' or 'grid') */}
        {viewMode !== 'map' && (
          <>
            {filteredAndSortedSpots.length > 0 ? (
              cardDisplayMode === 'list' ? (
                /* Compact List Layout (Fast browsing, minimal vertical scroll) */
                <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200">
                  {filteredAndSortedSpots.map((spot) => (
                    <SpotListItem
                      key={spot.id}
                      spot={spot}
                      onSelect={(selected) => {
                        setSelectedSpot(selected);
                        setActiveMapSpotId(selected.id);
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleVisited={handleToggleVisited}
                    />
                  ))}
                </div>
              ) : (
                /* Rich Large Photo Card Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 animate-in fade-in duration-200">
                  {filteredAndSortedSpots.map((spot) => (
                    <SpotCard
                      key={spot.id}
                      spot={spot}
                      onSelect={(selected) => {
                        setSelectedSpot(selected);
                        setActiveMapSpotId(selected.id);
                      }}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleVisited={handleToggleVisited}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Empty State */
              <div className="bg-white rounded-3xl border border-stone-200/80 p-8 sm:p-12 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
                  <SearchX className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    該当するお店が見つかりませんでした
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    検索キーワードや絞り込み条件（エリア・ジャンル・価格帯）を変更するか、リセットしてお試しください。
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>条件をリセット</span>
                  </button>

                  <button
                    onClick={() => setIsStarterModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>スターターパック（5選）を取り込む</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingSpot(null);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>お店を直接登録</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      )}

      {/* Floating Add Button for Mobile Ease */}
      <div className="fixed bottom-6 right-6 sm:hidden z-40">
        <button
          onClick={() => {
            setEditingSpot(null);
            setIsAddModalOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-gradient-to-r from-slate-900 to-zinc-800 hover:from-amber-600 hover:to-orange-600 text-amber-300 flex items-center justify-center shadow-xl shadow-slate-950/30 active:scale-95 transition-all cursor-pointer border border-slate-700/50"
          title="新規追加"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200/60 bg-white/50 py-6 text-center text-xs text-stone-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-stone-500">
            GourmetShare — 友だちのおすすめグルメログ
          </p>
          <p className="text-[11px]">
            登録店舗数: {spots.length}件 / お気に入り: {favoriteCount}件
          </p>
        </div>
      </footer>

      {/* Spot Detail Modal */}
      {selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          allSpots={spots}
          onClose={() => setSelectedSpot(null)}
          onSelectSpot={(nextSpot) => setSelectedSpot(nextSpot)}
          onToggleFavorite={handleToggleFavorite}
          onToggleVisited={handleToggleVisited}
          onUpdateSpot={handleSaveSpot}
          hidePrivateMemoMode={hidePrivateMemo}
          onEditSpot={(spot) => {
            setEditingSpot(spot);
            setSelectedSpot(null);
            setIsAddModalOpen(true);
          }}
          onDeleteSpot={handleDeleteSpot}
          onShowToast={showToast}
        />
      )}

      {/* Quick URL Import Modal */}
      <QuickUrlImportModal
        isOpen={isQuickImportOpen}
        onClose={() => {
          setIsQuickImportOpen(false);
          setQuickImportInitialText('');
        }}
        initialShareText={quickImportInitialText}
        onSuccessParsed={handleSuccessParsedFromShare}
        onShowToast={showToast}
      />

      {/* Add / Edit Spot Modal */}
      {isAddModalOpen && (
        <AddEditSpotModal
          initialSpot={editingSpot}
          isAiPrefilled={isAiPrefilled}
          availableFolders={folders}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingSpot(null);
            setIsAiPrefilled(false);
          }}
          onSave={handleSaveSpot}
        />
      )}

      {/* Random Roulette Spot Picker */}
      {isRandomModalOpen && (
        <RandomRouletteModal
          spots={filteredAndSortedSpots.length > 0 ? filteredAndSortedSpots : spots}
          onClose={() => setIsRandomModalOpen(false)}
          onSelectSpot={(spot) => {
            setSelectedSpot(spot);
            setIsRandomModalOpen(false);
          }}
          onShowToast={showToast}
        />
      )}

      {/* MyPage Modal (Folders, Privacy, Backup & Restore, Stats) */}
      <MyPageModal
        isOpen={isMyPageOpen}
        onClose={() => setIsMyPageOpen(false)}
        spots={spots}
        folders={folders}
        hidePrivateMemo={hidePrivateMemo}
        onToggleHidePrivateMemo={() => setHidePrivateMemo((prev) => !prev)}
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        onRestoreData={handleRestoreData}
        onShowToast={showToast}
        onOpenAddSpot={() => {
          setIsMyPageOpen(false);
          setEditingSpot(null);
          setIsAddModalOpen(true);
        }}
        onOpenStarterModal={() => {
          setIsMyPageOpen(false);
          setIsStarterModalOpen(true);
        }}
        onToggleShareFolder={handleToggleShareFolder}
      />

      {/* Starter Pack Modal */}
      <StarterPackModal
        isOpen={isStarterModalOpen}
        onClose={() => setIsStarterModalOpen(false)}
        onImportPack={handleImportStarterPack}
        importedPackIds={importedPackIds}
      />

      {/* Share App / Invite Modal */}
      <ShareAppModal
        isOpen={isShareAppModalOpen}
        onClose={() => setIsShareAppModalOpen(false)}
        spots={spots}
        onShowToast={showToast}
      />

      {/* Bulk URL Import Modal */}
      <BulkUrlImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        existingSpots={spots}
        folders={folders}
        onBatchImport={handleBatchImportSpots}
        onShowToast={showToast}
        onOpenMyPage={() => setIsMyPageOpen(true)}
      />

      {/* Toast Feedback */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
