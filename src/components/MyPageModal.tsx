import React, { useState } from 'react';
import {
  User,
  X,
  PieChart,
  FolderOpen,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle2,
  Bookmark,
  MapPin,
  Utensils,
  Award,
  Sparkles,
  Heart,
  Wallet,
  Users2,
  RotateCcw,
  ShieldCheck,
  FileJson,
  Copy,
  Check,
  Share2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { RestaurantSpot, CustomFolder, PriceRange, Scene, ALL_SCENES } from '../types';
import { downloadJsonBackup, parseBackupFile } from '../utils/backupHelper';
import { generateRecommenderAvatar } from '../utils/helpers';
import { generateCollabFolderInviteUrl } from '../utils/collabFolderHelper';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: RestaurantSpot[];
  folders: CustomFolder[];
  onAddFolder: (folder: CustomFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onRestoreData: (newSpots: RestaurantSpot[], newFolders: CustomFolder[]) => void;
  onResetToSampleData: () => void;
  hidePrivateMemoMode: boolean;
  onToggleHidePrivateMemoMode: () => void;
  onShowToast: (msg: string) => void;
  onSelectFolderFilter?: (folderName: string) => void;
  onOpenStarterModal?: () => void;
  onToggleShareFolder?: (folderId: string) => void;
}

type TabType = 'stats' | 'folders' | 'backup' | 'privacy';

const FOLDER_COLORS = [
  { key: 'rose', bg: 'bg-rose-500' },
  { key: 'amber', bg: 'bg-amber-500' },
  { key: 'emerald', bg: 'bg-emerald-500' },
  { key: 'indigo', bg: 'bg-indigo-500' },
  { key: 'purple', bg: 'bg-purple-500' },
  { key: 'sky', bg: 'bg-sky-500' },
];

const ALL_PRICE_RANGES: PriceRange[] = ['〜1000円', '1000〜3000円', '3000〜5000円', '5000円〜'];

export const MyPageModal: React.FC<MyPageModalProps> = ({
  isOpen,
  onClose,
  spots,
  folders,
  onAddFolder,
  onDeleteFolder,
  onRestoreData,
  onResetToSampleData,
  hidePrivateMemoMode,
  onToggleHidePrivateMemoMode,
  onShowToast,
  onSelectFolderFilter,
  onOpenStarterModal,
  onToggleShareFolder,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  // New folder form state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('rose');
  const [isImporting, setIsImporting] = useState(false);

  const handleShareFolder = async (folder: CustomFolder, e: React.MouseEvent) => {
    e.stopPropagation();

    // Find all spots belonging to this folder
    const spotsInFolder = spots.filter((s) => s.folders?.includes(folder.name));
    const inviteUrl = generateCollabFolderInviteUrl(folder, spotsInFolder);

    const shareText = `【GourmetShare 🤝 コラボ手帳招待】\n「📁 ${folder.name}」手帳を一緒に共有しよう！\nお互いの「行きたい店」を追加・チェックできるよ🍴\n👉 ${inviteUrl}`;

    if (onToggleShareFolder) {
      onToggleShareFolder(folder.id);
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `【コラボ手帳招待】${folder.name}`,
          text: shareText,
          url: inviteUrl,
        });
        onShowToast(`👥 「${folder.name}」コラボ手帳の招待メニューを開きました！`);
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      onShowToast(`🤝 コラボ手帳の招待URL（${spotsInFolder.length}軒入り）をコピーしました！`);
    } catch {
      window.prompt('招待URLをコピーしてください:', inviteUrl);
    }
  };

  if (!isOpen) return null;

  // Statistics calculation
  const totalSpots = spots.length;
  const visitedSpots = spots.filter((s) => s.isVisited).length;
  const unvisitedSpots = totalSpots - visitedSpots;
  const visitedRatio = totalSpots > 0 ? Math.round((visitedSpots / totalSpots) * 100) : 0;
  const favoriteSpots = spots.filter((s) => s.isFavorite).length;

  // Area distribution
  const areaCounts: Record<string, number> = {};
  spots.forEach((s) => {
    if (s.area) {
      areaCounts[s.area] = (areaCounts[s.area] || 0) + 1;
    }
  });
  const topAreas = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxAreaCount = topAreas.length > 0 ? topAreas[0][1] : 1;

  // Genre distribution
  const genreCounts: Record<string, number> = {};
  spots.forEach((s) => {
    s.genres?.forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxGenreCount = topGenres.length > 0 ? topGenres[0][1] : 1;

  // Price Range distribution
  const priceCounts: Record<PriceRange, number> = {
    '〜1000円': 0,
    '1000〜3000円': 0,
    '3000〜5000円': 0,
    '5000円〜': 0,
  };
  spots.forEach((s) => {
    if (s.priceRange && priceCounts[s.priceRange] !== undefined) {
      priceCounts[s.priceRange]++;
    }
  });

  // Scene distribution
  const sceneCounts: Record<Scene, number> = {
    デート: 0,
    女子会: 0,
    飲み会: 0,
    '2次会': 0,
    一人飯: 0,
    接待: 0,
    記念日: 0,
  };
  spots.forEach((s) => {
    s.scenes?.forEach((sc) => {
      if (sceneCounts[sc] !== undefined) {
        sceneCounts[sc]++;
      }
    });
  });

  // Top Recommenders
  const recommenderCounts: Record<string, number> = {};
  spots.forEach((s) => {
    if (s.recommender && s.recommender.trim()) {
      const rec = s.recommender.trim();
      recommenderCounts[rec] = (recommenderCounts[rec] || 0) + 1;
    }
  });
  const topRecommenders = Object.entries(recommenderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Handle Add Folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (folders.some((f) => f.name.toLowerCase() === newFolderName.trim().toLowerCase())) {
      onShowToast('同じ名前のフォルダが既に存在します');
      return;
    }

    const newFolder: CustomFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      createdAt: new Date().toISOString(),
    };

    onAddFolder(newFolder);
    setNewFolderName('');
    onShowToast(`📁 「${newFolder.name}」フォルダを作成しました`);
  };

  // Handle File Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await parseBackupFile(file);
      if (data.spots.length === 0) {
        throw new Error('有効な店舗データが見つかりませんでした');
      }

      if (
        window.confirm(
          `バックアップファイルから ${data.spots.length}件 の店舗と ${data.folders.length}個 のフォルダを復元しますか？現在のデータは上書きされます。`
        )
      ) {
        onRestoreData(data.spots, data.folders);
        onShowToast(`🎉 ${data.spots.length}件のデータを復元しました！`);
      }
    } catch (err: any) {
      alert(`復元エラー: ${err.message}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div
      id="mypage-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>マイページ & データ管理</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                グルメ統計・フォルダ管理・バックアップ・プライバシー
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50/80 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>マイ統計</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('folders')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'folders'
                ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>フォルダ ({folders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>データ保存・復元</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-stone-900 text-stone-900 bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>プライバシー</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'border-[#2D4B3E] text-[#2D4B3E] bg-white shadow-2xs font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#2D4B3E]" />
            <span>💬 ご意見・FB</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {totalSpots === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-stone-500 space-y-2">
                  <PieChart className="w-8 h-8 mx-auto text-stone-400 stroke-1" />
                  <p className="text-sm font-semibold text-stone-700">まだ登録店舗がありません</p>
                  <p className="text-xs text-stone-400">
                    おすすめのお店を追加すると、ここにあなたのグルメ統計が表示されます。
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                      <div className="text-[11px] font-semibold text-stone-500">総登録店舗</div>
                      <div className="text-xl font-bold text-stone-900 mt-1">{totalSpots} <span className="text-xs font-normal text-stone-500">軒</span></div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                      <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
                        <span>訪問済み</span>
                      </div>
                      <div className="text-xl font-bold text-stone-900 mt-1">{visitedSpots} <span className="text-xs font-normal text-stone-500">軒</span></div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                      <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 text-stone-600" />
                        <span>行きたい店</span>
                      </div>
                      <div className="text-xl font-bold text-stone-900 mt-1">{unvisitedSpots} <span className="text-xs font-normal text-stone-500">軒</span></div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                      <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-orange-600" />
                        <span>お気に入り</span>
                      </div>
                      <div className="text-xl font-bold text-stone-900 mt-1">{favoriteSpots} <span className="text-xs font-normal text-stone-500">軒</span></div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <div className="flex justify-between items-center text-xs font-semibold text-stone-800">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-stone-600" />
                        <span>訪問達成率</span>
                      </span>
                      <span className="font-bold text-stone-900">
                        {visitedRatio}% ({visitedSpots}/{totalSpots} 軒)
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-stone-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${visitedRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Top Areas & Top Genres Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Top Areas */}
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-500" />
                          <span>よく行くエリア TOP</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal">登録件数順</span>
                      </h3>
                      <div className="space-y-2.5">
                        {topAreas.map(([area, count], idx) => {
                          const percent = Math.round((count / maxAreaCount) * 100);
                          return (
                            <div key={area} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-4 text-[11px] font-bold text-stone-400">{idx + 1}</span>
                                  <span className="font-semibold text-stone-800 truncate">{area}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-stone-600 shrink-0 ml-2">
                                  {count} 軒
                                </span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-stone-800 h-full rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {topAreas.length === 0 && (
                          <p className="text-xs text-stone-400 py-2">エリアデータがありません</p>
                        )}
                      </div>
                    </div>

                    {/* Top Genres */}
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-stone-500" />
                          <span>好みのジャンル TOP</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal">登録件数順</span>
                      </h3>
                      <div className="space-y-2.5">
                        {topGenres.map(([genre, count], idx) => {
                          const percent = Math.round((count / maxGenreCount) * 100);
                          return (
                            <div key={genre} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-4 text-[11px] font-bold text-stone-400">{idx + 1}</span>
                                  <span className="font-semibold text-stone-800 truncate">{genre}</span>
                                </div>
                                <span className="text-[11px] font-semibold text-stone-600 shrink-0 ml-2">
                                  {count} 軒
                                </span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-stone-800 h-full rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {topGenres.length === 0 && (
                          <p className="text-xs text-stone-400 py-2">ジャンルデータがありません</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Range & Scene Distribution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Price Range Distribution */}
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-stone-500" />
                        <span>予算帯の内訳</span>
                      </h3>
                      <div className="space-y-2">
                        {ALL_PRICE_RANGES.map((price) => {
                          const count = priceCounts[price] || 0;
                          const percent = totalSpots > 0 ? Math.round((count / totalSpots) * 100) : 0;
                          return (
                            <div key={price} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-stone-700">{price}</span>
                                <span className="text-[11px] text-stone-500">
                                  {count} 軒 ({percent}%)
                                </span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-stone-700 h-full rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scene Distribution */}
                    <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Users2 className="w-3.5 h-3.5 text-stone-500" />
                        <span>おすすめシーン別件数</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_SCENES.map((scene) => {
                          const count = sceneCounts[scene] || 0;
                          return (
                            <div
                              key={scene}
                              className="p-2 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between"
                            >
                              <span className="text-xs font-medium text-stone-700">#{scene}</span>
                              <span className="text-xs font-semibold text-stone-900 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top Recommenders */}
                  {topRecommenders.length > 0 && (
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        <span>教えてくれた人（情報通ランキング）</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {topRecommenders.map(([person, count], idx) => {
                          const avatar = generateRecommenderAvatar(person);
                          return (
                            <div
                              key={person}
                              className="p-2.5 rounded-lg bg-white border border-stone-200 flex items-center gap-2 min-w-0"
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatar.bg} ${avatar.text}`}
                              >
                                {avatar.initial}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-stone-900 truncate">
                                  {person}
                                </div>
                                <div className="text-[10px] text-stone-500">
                                  {count} 軒おすすめ
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: FOLDERS */}
          {activeTab === 'folders' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Starter Pack Import Banner */}
              {onOpenStarterModal && (
                <div className="p-3.5 rounded-xl bg-stone-900 text-white flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>厳選スターターパックから一括追加</span>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        「渋谷・表参道デート」「サク飲み居酒屋」等のフォルダを1タップ追加
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStarterModal();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    パックを見る
                  </button>
                </div>
              )}

              {/* Create Folder Form */}
              <form
                onSubmit={handleCreateFolder}
                className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3"
              >
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-stone-600" />
                  <span>新しいフォルダを作成</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="例: デート勝負店、2次会サク飲み、両親と会食"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-900"
                  />

                  {/* Color selector */}
                  <div className="flex items-center gap-1.5 justify-center py-1 sm:py-0">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        onClick={() => setNewFolderColor(c.key)}
                        className={`w-5 h-5 rounded-full ${c.bg} transition-transform cursor-pointer ${
                          newFolderColor === c.key ? 'ring-2 ring-stone-900 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="px-4 py-2 rounded-lg bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-all"
                  >
                    作成
                  </button>
                </div>
              </form>

              {/* Folder List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-700">登録済みフォルダ一覧</div>

                {folders.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                    まだフォルダがありません。上のフォームから作成してください。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {folders.map((folder) => {
                      const spotCountInFolder = spots.filter((s) =>
                        s.folders?.includes(folder.name)
                      ).length;

                      return (
                        <div
                          key={folder.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 hover:border-stone-400 group transition-all"
                        >
                          <div
                            onClick={() => {
                              onSelectFolderFilter && onSelectFolderFilter(folder.name);
                              onClose();
                            }}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                          >
                            <span className="p-1.5 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                              <FolderOpen className="w-4 h-4 text-stone-600" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-stone-900 truncate">
                                  {folder.name}
                                </span>
                                {folder.isShared && (
                                  <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold text-[9px] shrink-0 border border-orange-200">
                                    👥 共同編集
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-500">
                                {spotCountInFolder} 軒の店舗
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleShareFolder(folder, e)}
                              className="px-2 py-1 rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-600 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="LINEで友達を招待して共同編集"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span className="hidden sm:inline">招待</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `「${folder.name}」フォルダを削除しますか？（店舗データ自体は削除されません）`
                                  )
                                ) {
                                  onDeleteFolder(folder.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="フォルダを削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-stone-700" />
                  <span>グルメデータの保護と復元</span>
                </div>
                <p className="text-stone-500 leading-relaxed">
                  ブラウザのキャッシュ消去や機種変更に備えて、定期的にバックアップファイルをダウンロードしておくことをおすすめします。
                </p>
              </div>

              {/* Export Button */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-stone-600" />
                  <span>バックアップをダウンロード（JSON）</span>
                </div>
                <p className="text-xs text-stone-500">
                  現在の全店舗（{spots.length}件）とフォルダ構成を1つのファイルに書き出します。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    downloadJsonBackup(spots, folders);
                    onShowToast('📥 バックアップファイルをダウンロードしました');
                  }}
                  className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSONファイルをダウンロード</span>
                </button>
              </div>

              {/* Import Button */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-stone-600" />
                  <span>バックアップファイルから復元</span>
                </div>
                <p className="text-xs text-stone-500">
                  以前ダウンロードしたJSONファイルを選択して、店舗データを復元します。
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold text-xs transition-all cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isImporting ? '読み込み中...' : 'ファイルを選択して復元'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isImporting}
                  />
                </label>
              </div>

              {/* Reset to Sample Data */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-stone-500" />
                  <span>サンプルデータに初期化</span>
                </div>
                <p className="text-xs text-stone-500">
                  初期の東京おすすめスポット一覧（8件）に戻します。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        '初期のサンプルデータに戻しますか？（現在のデータは失われます）'
                      )
                    ) {
                      onResetToSampleData();
                      onShowToast('🔄 サンプルデータに初期化しました');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  初期データに戻す
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Private Memo Presentation Mode */}
              <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-stone-700" />
                      <span>非公開メモの表示モード</span>
                    </div>
                    <p className="text-xs text-stone-500">
                      友達にアプリ画面を見せるときに、個人的な非公開メモを非表示にできます。
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleHidePrivateMemoMode}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      hidePrivateMemoMode
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    {hidePrivateMemoMode ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>非公開メモを非表示中</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>非公開メモを表示中</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Explanation about Private vs Public Note */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-600">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-stone-600" />
                  <span>2種類のメモの使い分けについて</span>
                </div>
                <div className="space-y-1.5 pl-1">
                  <div>
                    <span className="font-semibold text-stone-800">1. おすすめコメント・訪問メモ（通常）:</span>
                    <p className="text-stone-500">
                      「看板メニューのスコーンが絶品」「接客が温かい」など、友達にも共有したい感想。
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">2. 自分専用・非公開メモ（🔒）:</span>
                    <p className="text-stone-500">
                      「実際のお会計総額」「一緒に行った相手の名前」「混雑・予約のコツ」など、自分だけの秘密の記録。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-[#E8ECE8]/60 p-5 rounded-2xl border border-[#C5D8C5] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2D4B3E] text-emerald-200 flex items-center justify-center shadow-2xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">
                      ご意見・改善リクエスト・バグ報告 💬
                    </h3>
                    <p className="text-xs text-stone-500">
                      「こんな機能がほしい！」「ここが使いづらい」など、あなたの声を教えてください。
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  いただいたご意見は1枚のスプレッドシートに自動集約され、メール通知で即座に開発者へ届きます。メアド入力は一切不要です！
                </p>

                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfeBZI6f9TbN7ecmH2vHE-69-X66_Y_RZlojpiOoe2mnroUkw/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#2D4B3E] hover:bg-[#233B31] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <span>💬 フィードバックフォーム（Googleフォーム）を開く</span>
                  <ExternalLink className="w-4 h-4 text-emerald-200" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

