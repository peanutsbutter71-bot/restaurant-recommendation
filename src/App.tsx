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
import { CollabFolderInviteModal } from './components/CollabFolderInviteModal';
import { parseCollabFolderInviteUrl, CollabFolderInvitePayload } from './utils/collabFolderHelper';
import { UserNameSetupModal } from './components/UserNameSetupModal';
import { TutorialHelpModal } from './components/TutorialHelpModal';
import {
  getGroupCodeFromUrlOrStorage,
  getUserName,
  setUserName,
  fetchGroupCloudData,
  syncGroupCloudData,
  deleteSpotFromCloudGroup,
} from './utils/groupSync';
import {
  saveSpotsToIndexedDb,
  loadSpotsFromIndexedDb,
  saveFoldersToIndexedDb,
} from './utils/indexedDbStorage';
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
  LayoutGrid,
  List,
  Share2,
  Clipboard,
  Utensils,
  Flame,
  Camera,
  ListFilter,
  User,
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
  // Collaborative Folder Invite Payload state (parsed from ?collabFolder=...)
  const [collabInvitePayload, setCollabInvitePayload] = useState<CollabFolderInvitePayload | null>(() =>
    parseCollabFolderInviteUrl(window.location.search)
  );

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

  const handleJoinCollabFolder = (invite: CollabFolderInvitePayload) => {
    const { folder, spots: sharedSpots } = invite;

    // 1. Ensure shared folder exists and has isShared: true
    setFolders((prev) => {
      const existing = prev.find((f) => f.name.toLowerCase() === folder.name.toLowerCase());
      if (existing) {
        return prev.map((f) =>
          f.name.toLowerCase() === folder.name.toLowerCase() ? { ...f, isShared: true } : f
        );
      }
      return [...prev, { ...folder, isShared: true }];
    });

    // 2. Insert/Merge shared spots into user's list
    if (sharedSpots.length > 0) {
      const nowIso = new Date().toISOString();
      const newSpotsToInsert: RestaurantSpot[] = sharedSpots.map((spotTemplate, idx) => ({
        ...spotTemplate,
        id: `spot-collab-${Date.now()}-${idx}`,
        createdAt: nowIso,
        folders: Array.from(new Set([...(spotTemplate.folders || []), folder.name])),
      }));
      setSpots((prev) => [...newSpotsToInsert, ...prev]);
    }

    // 3. Automatically filter current view to this shared folder
    setFilters((prev) => ({ ...prev, folders: [folder.name] }));

    // 4. Close invitation modal & clean URL search string
    setCollabInvitePayload(null);
    window.history.replaceState({}, '', window.location.pathname);
    showToast(`🎉 「📁 ${folder.name}」コラボ手帳に参加しました！`);
  };

  // Inline Quick Import input in hero/banner
  const [heroInputUrl, setHeroInputUrl] = useState('');
  const [isHeroAnalyzing, setIsHeroAnalyzing] = useState(false);

  // Tutorial & Help Modal State
  const TUTORIAL_SEEN_KEY = 'gourmet_share_has_seen_tutorial';
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(TUTORIAL_SEEN_KEY);
  });

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch (e) {
      // fallback
    }
  };

  // Group Cloud Sync State (0% Account Registration)
  const [groupCode, setGroupCodeState] = useState<string>(() => getGroupCodeFromUrlOrStorage());
  const [currentUserName, setCurrentUserNameState] = useState<string | null>(() => getUserName());
  const [isNameSetupOpen, setIsNameSetupOpen] = useState<boolean>(() => !getUserName());
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  const handleSaveUserName = (name: string) => {
    setUserName(name);
    setCurrentUserNameState(name);
    setIsNameSetupOpen(false);
    showToast(`✨ 「${name}」として手帳に参加しました！`);
    // Initial Sync
    syncGroupCloudData(groupCode, spots, folders, name).then((res) => {
      if (res) {
        if (res.spots && res.spots.length > 0) setSpots(res.spots);
        if (res.members) setGroupMembers(res.members);
      }
    });
  };

  // Background Cloud Sync on startup & periodic 8s poll
  useEffect(() => {
    const code = getGroupCodeFromUrlOrStorage();
    setGroupCodeState(code);

    const pullCloudData = () => {
      fetchGroupCloudData(code).then((res) => {
        if (res) {
          if (res.members) setGroupMembers(res.members);
          if (res.spots && res.spots.length > 0) {
            setSpots((prev) => {
              const map = new Map<string, RestaurantSpot>();
              for (const s of prev) map.set(s.id, s);
              for (const s of res.spots) map.set(s.id, s);
              return Array.from(map.values());
            });
          }
        }
      });
    };

    pullCloudData();
    const interval = setInterval(pullCloudData, 8000);
    return () => clearInterval(interval);
  }, [groupCode]);

  // Sync to Cloud whenever spots or folders change
  useEffect(() => {
    if (spots.length > 0 || folders.length > 0) {
      syncGroupCloudData(groupCode, spots, folders, currentUserName || undefined).then((res) => {
        if (res && res.members) {
          setGroupMembers(res.members);
        }
      });
    }
  }, [spots, folders, groupCode, currentUserName]);

  // Load IndexedDB backup asynchronously on startup if available
  useEffect(() => {
    loadSpotsFromIndexedDb().then((dbSpots) => {
      if (dbSpots && dbSpots.length > 0) {
        setSpots((prev) => {
          if (prev.length < dbSpots.length) {
            return dbSpots;
          }
          return prev;
        });
      }
    });
  }, []);

  // Sync spots to localStorage and IndexedDB (for large volume storage protection)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(spots));
    } catch (e) {
      console.warn('localStorage full, relying on IndexedDB:', e);
    }
    saveSpotsToIndexedDb(spots);
  }, [spots]);

  // Sync folders to localStorage and IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders to storage', e);
    }
    saveFoldersToIndexedDb(folders);
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

  // Handler for Account-Free Reaction Stamps (❤️ 😋 🥂 🔥)
  const handleToggleReaction = (spotId: string, emoji: string) => {
    setSpots((prevSpots) =>
      prevSpots.map((spot) => {
        if (spot.id !== spotId) return spot;

        const currentReactions = { ...(spot.reactions || {}) };
        const currentUserReactions = [...(spot.userReactions || [])];
        const isAlreadySelected = currentUserReactions.includes(emoji);

        let newReactions = { ...currentReactions };
        let newUserReactions = [...currentUserReactions];

        if (isAlreadySelected) {
          newReactions[emoji] = Math.max(0, (newReactions[emoji] || 1) - 1);
          newUserReactions = newUserReactions.filter((e) => e !== emoji);
          showToast(`「${emoji}」スタンプを取り消しました`);
        } else {
          newReactions[emoji] = (newReactions[emoji] || 0) + 1;
          newUserReactions.push(emoji);
          showToast(`「${emoji}」スタンプを押しました！✨`);
        }

        return {
          ...spot,
          reactions: newReactions,
          userReactions: newUserReactions,
        };
      })
    );
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
  const handleSaveSpot = (spotData: RestaurantSpot) => {
    const finalSpot: RestaurantSpot = {
      ...spotData,
      recommender: spotData.recommender && spotData.recommender.trim() !== ''
        ? spotData.recommender
        : (currentUserName || '身内メンバー'),
    };

    setSpots((prev) => {
      const exists = prev.some((s) => s.id === finalSpot.id);
      if (exists) {
        return prev.map((s) => (s.id === finalSpot.id ? finalSpot : s));
      }
      return [finalSpot, ...prev];
    });

    // Cloud sync
    syncGroupCloudData(groupCode, [finalSpot], folders, currentUserName || undefined);

    setIsAddModalOpen(false);
    setEditingSpot(null);
    setSelectedSpot(finalSpot);
    showToast(editingSpot ? 'お店情報を更新しました✨' : '新しいお店を記録しました🎉');
  };

  // Delete spot
  const handleDeleteSpot = (id: string) => {
    const spotToDelete = spots.find((s) => s.id === id);
    setSpots((prev) => prev.filter((s) => s.id !== id));
    deleteSpotFromCloudGroup(groupCode, id);
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
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col pb-16 md:pb-0">
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
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenNameSetup={() => setIsNameSetupOpen(true)}
        onOpenFeedback={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfeBZI6f9TbN7ecmH2vHE-69-X66_Y_RZlojpiOoe2mnroUkw/viewform', '_blank')}
        currentUserName={currentUserName}
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
          {/* Active Group Cloud Sync Status Bar */}
          <div className="bg-[#2D4B3E] text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold">🤝 身内全員リアルタイム共有中</span>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                {groupCode}
              </span>
              {groupMembers.length > 0 && (
                <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.5 rounded-md font-semibold">
                  👥 メンバー: {groupMembers.join(', ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emerald-100/90 font-medium">
                あなたの名前: <strong className="text-white underline">{currentUserName || '未設定'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsNameSetupOpen(true)}
                className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer text-[10px]"
              >
                変更
              </button>
            </div>
          </div>

          {/* Quick URL / Share Import Hero Bar */}
          <div className="bg-[#E8ECE8]/50 p-4 sm:p-5 rounded-3xl border border-[#C5D8C5] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#2D4B3E] flex items-center justify-center text-emerald-200 shadow-2xs">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <span>共有URLからAI一発登録</span>
                    <span className="text-[10px] bg-[#2D4B3E] text-emerald-200 px-2 py-0.2 rounded-full font-bold">
                      食べログ・Googleマップ・Instagram
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500 hidden sm:block">
                    リンクを貼るだけで、店名・エリア・ジャンル・予算をAIが自動抽出して記録できます
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setQuickImportInitialText('');
                    setIsQuickImportOpen(true);
                  }}
                  className="text-xs font-bold text-[#2D4B3E] hover:underline flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-[#C5D8C5] shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>📷 画像スクショで解析</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickImportInitialText('');
                    setIsQuickImportOpen(true);
                  }}
                  className="text-xs font-bold text-[#2D4B3E] hover:underline hidden sm:flex items-center gap-1 cursor-pointer"
                >
                  <span>詳しい使い方・PWA共有ガイド</span>
                </button>
              </div>
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
                  className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D4B3E]/20 focus:border-[#2D4B3E] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleHeroPaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-stone-600 hover:text-[#2D4B3E] bg-stone-100 hover:bg-[#E8ECE8] rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="クリップボードから貼り付け"
                >
                  <Clipboard className="w-3 h-3 text-[#2D4B3E]" />
                  <span>貼付</span>
                </button>
              </div>

              <button
                id="hero-quick-analyze-btn"
                type="button"
                onClick={handleHeroAnalyze}
                disabled={isHeroAnalyzing || !heroInputUrl.trim()}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isHeroAnalyzing
                    ? 'bg-stone-200 text-stone-500 cursor-wait'
                    : !heroInputUrl.trim()
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-[#2D4B3E] hover:bg-[#233B31] text-white active:scale-95 shadow-2xs'
                }`}
              >
                {isHeroAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    <span>AI解析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
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

        {/* Card Layout Switcher Header */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
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
        </div>

        {/* Spots List / Grid View */}
        <>
            {filteredAndSortedSpots.length > 0 ? (
              cardDisplayMode === 'list' ? (
                /* Compact List Layout (Fast browsing, minimal vertical scroll) */
                <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200">
                  {filteredAndSortedSpots.map((spot) => (
                    <SpotListItem
                      key={spot.id}
                      spot={spot}
                      onSelect={(selected) => setSelectedSpot(selected)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleVisited={handleToggleVisited}
                      onToggleReaction={handleToggleReaction}
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
                      onSelect={(selected) => setSelectedSpot(selected)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleVisited={handleToggleVisited}
                      onToggleReaction={handleToggleReaction}
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

      {/* Collaborative Folder Invite Modal */}
      <CollabFolderInviteModal
        inviteData={collabInvitePayload}
        onClose={() => setCollabInvitePayload(null)}
        onJoinFolder={handleJoinCollabFolder}
      />

      {/* Mobile Sticky Bottom Thumb Navigation Bar (親指操作ボトムナビ) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around">
        <button
          type="button"
          onClick={() => setMainTab('list')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mainTab === 'list' ? 'text-[#2D4B3E]' : 'text-stone-500'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>一覧</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('discover')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            mainTab === 'discover' ? 'text-[#2D4B3E]' : 'text-stone-500'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-500" />
          <span>発見</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setQuickImportInitialText('');
            setIsQuickImportOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-[#2D4B3E] cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>AI解析</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingSpot(null);
            setIsAddModalOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 px-3.5 py-1 rounded-xl text-[10px] font-bold bg-[#2D4B3E] text-white shadow-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 text-emerald-200" />
          <span>＋記録</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMyPageOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>手帳</span>
        </button>
      </div>

      {/* 5-Step First-Time Tutorial Onboarding Modal */}
      <TutorialHelpModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      {/* Instant 0% Account User Name Setup Modal */}
      <UserNameSetupModal
        isOpen={isNameSetupOpen}
        onSaveName={handleSaveUserName}
      />

      {/* Toast Feedback */}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}
