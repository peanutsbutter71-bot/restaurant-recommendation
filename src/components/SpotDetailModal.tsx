import React, { useState } from 'react';
import {
  X,
  Heart,
  MapPin,
  Share2,
  Edit3,
  Trash2,
  Check,
  Tag,
  Users2,
  ArrowRight,
  UtensilsCrossed,
  Bookmark,
  CheckCircle2,
  MessageSquare,
  MessageSquareHeart,
  Save,
  Lock,
  EyeOff,
  FolderOpen,
  Store,
  Sparkles,
} from 'lucide-react';
import { RestaurantSpot } from '../types';
import {
  formatJapaneseDate,
  getRelatedSpots,
  generateRecommenderAvatar,
  getOptimizedImageUrl,
} from '../utils/helpers';
import { checkStoreOperatingStatus, getOperatingStatusBadge } from '../utils/aiStatusCheck';
import { SpotDetailMap } from './SpotDetailMap';

interface SpotDetailModalProps {
  spot: RestaurantSpot;
  allSpots: RestaurantSpot[];
  onClose: () => void;
  onSelectSpot: (spot: RestaurantSpot) => void;
  onToggleFavorite: (id: string) => void;
  onToggleVisited?: (id: string) => void;
  onUpdateSpot?: (spot: RestaurantSpot) => void;
  onEditSpot: (spot: RestaurantSpot) => void;
  onDeleteSpot: (id: string) => void;
  onShowToast: (message: string) => void;
  hidePrivateMemoMode?: boolean;
}

export const SpotDetailModal: React.FC<SpotDetailModalProps> = ({
  spot,
  allSpots,
  onClose,
  onSelectSpot,
  onToggleFavorite,
  onToggleVisited,
  onUpdateSpot,
  onEditSpot,
  onDeleteSpot,
  onShowToast,
  hidePrivateMemoMode = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Visit memo state
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState(spot.myMemo || '');
  const [visitedDate, setVisitedDate] = useState(
    spot.visitedAt || new Date().toISOString().split('T')[0]
  );

  // Private memo state
  const [isEditingPrivateMemo, setIsEditingPrivateMemo] = useState(false);
  const [privateMemoText, setPrivateMemoText] = useState(spot.privateMemo || '');

  // AI Store Status checking state
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const avatar = generateRecommenderAvatar(spot.recommender);
  const relatedSpots = getRelatedSpots(spot, allSpots);
  const statusBadge = getOperatingStatusBadge(spot.operatingStatus);

  const handleSaveVisitMemo = () => {
    if (onUpdateSpot) {
      onUpdateSpot({
        ...spot,
        isVisited: true,
        visitedAt: visitedDate,
        myMemo: memoText.trim() || undefined,
      });
      setIsEditingMemo(false);
      onShowToast('訪問メモを更新しました');
    }
  };

  const handleSavePrivateMemo = () => {
    if (onUpdateSpot) {
      onUpdateSpot({
        ...spot,
        privateMemo: privateMemoText.trim() || undefined,
      });
      setIsEditingPrivateMemo(false);
      onShowToast('非公開メモを保存しました');
    }
  };

  // AI Status Check Handler
  const handleCheckStoreStatus = async () => {
    setIsCheckingStatus(true);
    onShowToast('AIが最新の営業状況を確認中...');
    try {
      const result = await checkStoreOperatingStatus({
        name: spot.name,
        area: spot.area,
        mapUrl: spot.mapUrl,
        tabelogUrl: spot.tabelogUrl,
      });

      if (onUpdateSpot) {
        onUpdateSpot({
          ...spot,
          operatingStatus: result.operatingStatus,
          statusCheckNote: result.statusCheckNote,
          lastStatusCheckedAt: result.checkedAt,
        });
      }

      const badge = getOperatingStatusBadge(result.operatingStatus);
      onShowToast(`営業状況: 【${badge.label}】 ${result.statusCheckNote}`);
    } catch (err: any) {
      console.error('Status check error:', err);
      onShowToast('営業状況の確認に失敗しました');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleShare = async () => {
    const shareText = `【${spot.name}】(${spot.area})\nおすすめ: ${spot.recommender}\n予算: ${spot.priceRange}\n「${spot.comment}」\n${
      spot.mapUrl ? `マップ: ${spot.mapUrl}` : ''
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${spot.name} - おすすめグルメ`,
          text: shareText,
        });
        onShowToast('おすすめ情報をシェアしました');
      } catch {
        // Fallback
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        onShowToast('おすすめテキストをコピーしました');
        setTimeout(() => setCopied(false), 2500);
      } catch {
        onShowToast('コピーに失敗しました');
      }
    }
  };

  const handleLineInvite = async () => {
    const inviteText = `【今度ここ行かない？🍴】\n📍 ${spot.name} (${spot.area})\n👤 ${spot.recommender} のおすすめ！\n💰 予算: ${spot.priceRange}${spot.highlightDish ? `\n✨ 推しメニュー: ${spot.highlightDish}` : ''}\n💬「${spot.comment}」\n${
      spot.mapUrl ? `📍 マップ: ${spot.mapUrl}` : spot.tabelogUrl ? `🍽️ 食べログ: ${spot.tabelogUrl}` : ''
    }`;

    const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(inviteText)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `【今度ここ行かない？】${spot.name}`,
          text: inviteText,
        });
        onShowToast('LINE・SNS共有メニューを開きました');
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      onShowToast('💬 LINEに貼れる招待テキストをコピーしました！');
      setTimeout(() => setCopied(false), 2500);
      window.open(lineShareUrl, '_blank');
    } catch {
      window.open(lineShareUrl, '_blank');
    }
  };

  return (
    <div
      id="spot-detail-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="spot-detail-content"
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Image Section */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-stone-900">
            <img
              src={getOptimizedImageUrl(spot.imageUrl, 800)}
              alt={spot.name}
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-black/40" />

            {/* Top Bar Actions */}
            <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
              <button
                id="detail-close-btn"
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                title="閉じる"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                {/* LINE Invite Action Button */}
                <button
                  id="detail-line-invite-btn"
                  onClick={handleLineInvite}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white backdrop-blur-md text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="LINEで一緒に行こうと誘う"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>LINEで誘う</span>
                </button>

                {/* Visit Status Toggle Button */}
                <button
                  id="detail-visit-status-btn"
                  onClick={() => onToggleVisited && onToggleVisited(spot.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-semibold transition-all cursor-pointer ${
                    spot.isVisited
                      ? 'bg-stone-900/90 text-stone-200 border border-stone-700 hover:bg-stone-900'
                      : 'bg-white/90 hover:bg-white text-stone-900 shadow-sm'
                  }`}
                >
                  {spot.isVisited ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-stone-300 stroke-[2.5]" />
                      <span>訪問済み</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-[#2D4B3E] stroke-[2.5]" />
                      <span>行きたい</span>
                    </>
                  )}
                </button>

                <button
                  id="detail-share-btn"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-900 backdrop-blur-md text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  title="シェア"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-stone-900" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'コピー済' : 'シェア'}</span>
                </button>

                <button
                  id="detail-fav-btn"
                  onClick={() => onToggleFavorite(spot.id)}
                  className={`p-2 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
                    spot.isFavorite
                      ? 'bg-white text-[#2D4B3E] shadow-sm'
                      : 'bg-black/50 hover:bg-black/70 text-white'
                  }`}
                  title={spot.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      spot.isFavorite ? 'fill-[#2D4B3E]' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom Title on Hero */}
            <div className="absolute bottom-3.5 left-4 right-4 text-white">
              <div className="flex items-center gap-2 flex-wrap mb-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/95 text-stone-900 font-bold">
                  <MapPin className="w-3 h-3 text-stone-700" />
                  {spot.area}
                </span>
                <span className="px-2 py-0.5 rounded-md font-semibold bg-stone-900/90 text-stone-200 border border-stone-700/60">
                  {spot.priceRange}
                </span>
                {spot.isVisited ? (
                  <span className="px-2 py-0.5 rounded-md font-medium bg-stone-800/90 text-stone-300 border border-stone-700">
                    訪問済み
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md font-medium bg-[#2D4B3E]/90 text-white">
                    行きたい
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {spot.name}
              </h2>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* Recommender Quote Card */}
            <div className="bg-stone-50 rounded-xl p-4 sm:p-5 border border-stone-200/80">
              {/* Recommender identity */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatar.bg} ${avatar.text}`}
                >
                  {avatar.initial}
                </div>
                <div>
                  <div className="text-[11px] font-medium text-stone-500">
                    おすすめした人
                  </div>
                  <div className="text-sm font-bold text-stone-900">
                    {spot.recommender}
                  </div>
                </div>
              </div>

              {/* Comment text */}
              <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                {spot.comment}
              </p>
            </div>

            {/* Visit Status & My Memo Section */}
            <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    spot.isVisited ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {spot.isVisited ? <CheckCircle2 className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">
                      訪問ステータス: {spot.isVisited ? '訪問済み' : '未訪問'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {spot.isVisited ? '訪問日と公開感想メモ' : 'まだ行っていない気になるお店'}
                    </p>
                  </div>
                </div>

                <button
                  id="detail-memo-toggle-visited-btn"
                  onClick={() => onToggleVisited && onToggleVisited(spot.id)}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                >
                  {spot.isVisited ? '「行きたい」に変更' : '「訪問済み」に変更'}
                </button>
              </div>

              {/* If visited, show visit memo and date */}
              {spot.isVisited && (
                <div className="pt-2.5 border-t border-stone-100 space-y-2.5">
                  {!isEditingMemo ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700 flex items-center gap-1">
                          <MessageSquareHeart className="w-3.5 h-3.5 text-stone-500" />
                          訪問メモ・感想
                        </span>
                        <div className="flex items-center gap-2">
                          {spot.visitedAt && (
                            <span className="text-stone-400 text-[11px]">
                              訪問日: {spot.visitedAt}
                            </span>
                          )}
                          <button
                            id="edit-visit-memo-btn"
                            onClick={() => {
                              setMemoText(spot.myMemo || '');
                              setVisitedDate(spot.visitedAt || new Date().toISOString().split('T')[0]);
                              setIsEditingMemo(true);
                            }}
                            className="text-stone-900 font-semibold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <Edit3 className="w-3 h-3" />
                            {spot.myMemo ? '編集' : '追加'}
                          </button>
                        </div>
                      </div>

                      {spot.myMemo ? (
                        <p className="text-xs text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-200/80 whitespace-pre-wrap font-normal leading-relaxed">
                          {spot.myMemo}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                          訪問メモはまだありません。
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Inline Memo Editor */
                    <div className="space-y-2.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-stone-700">
                          訪問日
                        </label>
                        <input
                          id="input-visited-date"
                          type="date"
                          value={visitedDate}
                          onChange={(e) => setVisitedDate(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-800 focus:outline-none focus:border-stone-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-stone-700">
                          感想・食べたもの
                        </label>
                        <textarea
                          id="input-visited-memo"
                          rows={3}
                          placeholder="例: パスタが絶品だった。店員さんも親切。"
                          value={memoText}
                          onChange={(e) => setMemoText(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-md text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingMemo(false)}
                          className="px-2.5 py-1 rounded-md bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveVisitMemo}
                          className="flex items-center gap-1 px-3 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🔒 Private Memo Section */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-stone-900">
                        非公開メモ（自分専用）
                      </h3>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      会計額や同伴者など、他人に共有されないプライベート備忘録
                    </p>
                  </div>
                </div>

                {!isEditingPrivateMemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrivateMemoText(spot.privateMemo || '');
                      setIsEditingPrivateMemo(true);
                    }}
                    className="text-stone-800 text-xs font-semibold hover:underline cursor-pointer flex items-center gap-1 px-2.5 py-1 bg-white rounded-md border border-stone-200"
                  >
                    <Edit3 className="w-3 h-3" />
                    {spot.privateMemo ? '編集' : '追加'}
                  </button>
                )}
              </div>

              {!isEditingPrivateMemo ? (
                <div>
                  {hidePrivateMemoMode ? (
                    <div className="p-2.5 bg-stone-200/70 rounded-md text-xs text-stone-600 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                      <span>プライバシー保護のため非表示中</span>
                    </div>
                  ) : spot.privateMemo ? (
                    <div className="p-3 bg-white rounded-md border border-stone-200 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed font-normal">
                      {spot.privateMemo}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400 italic">
                      非公開メモは登録されていません。
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={privateMemoText}
                    onChange={(e) => setPrivateMemoText(e.target.value)}
                    placeholder="例: 2人で¥8,500。予約必須。"
                    className="w-full px-2.5 py-2 bg-white border border-stone-300 rounded-md text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPrivateMemo(false)}
                      className="px-2.5 py-1 rounded-md bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePrivateMemo}
                      className="flex items-center gap-1 px-3 py-1 rounded-md bg-stone-900 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      保存
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Store Status Check */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              statusBadge.isAlert
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-stone-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">
                        営業ステータス
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {spot.statusCheckNote && (
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        {spot.statusCheckNote}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckStoreStatus}
                  disabled={isCheckingStatus}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Google検索で営業状態を確認"
                >
                  <Sparkles className={`w-3 h-3 text-stone-500 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingStatus ? '確認中...' : '営業チェック'}</span>
                </button>
              </div>
            </div>

            {/* Folders List if present */}
            {spot.folders && spot.folders.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-stone-400" /> フォルダ:
                </span>
                {spot.folders.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Tags & Metadata Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Genres */}
              <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                  <span>ジャンル</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {spot.genres.map((genre) => (
                    <span
                      key={genre}
                      className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/80"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scenes */}
              <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Users2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>おすすめシーン</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {spot.scenes.map((scene) => (
                    <span
                      key={scene}
                      className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/80"
                    >
                      #{scene}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Location & Mini Map Section */}
            <SpotDetailMap spot={spot} onShowToast={onShowToast} />

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-stone-400">
                <span>登録日: {formatJapaneseDate(spot.createdAt)}</span>
              </div>

              {/* Edit & Delete Controls */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  id="detail-edit-btn"
                  onClick={() => onEditSpot(spot)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs border border-stone-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>編集</span>
                </button>

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <button
                      id="confirm-delete-btn"
                      onClick={() => onDeleteSpot(spot.id)}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      削除する
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs transition-colors cursor-pointer"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <button
                    id="detail-delete-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Related Recommendations */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-700">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    似ているおすすめスポット
                  </h3>
                </div>
              </div>

              {relatedSpots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {relatedSpots.map(({ spot: relSpot, matchReasons }) => (
                    <div
                      key={relSpot.id}
                      id={`related-spot-${relSpot.id}`}
                      onClick={() => onSelectSpot(relSpot)}
                      className="group bg-stone-50 hover:bg-white rounded-xl p-2.5 border border-stone-200/80 hover:border-stone-400 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden mb-2 bg-stone-200">
                          <img
                            src={
                              relSpot.imageUrl ||
                              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={relSpot.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/60 backdrop-blur-md text-white font-semibold text-[10px]">
                            {relSpot.area}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {relSpot.name}
                        </h4>

                        {/* Match Reason Tag */}
                        <p className="text-[10px] font-medium text-stone-500 mt-0.5 line-clamp-1">
                          {matchReasons[0] || 'おすすめ'}
                        </p>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                        <span>{relSpot.priceRange}</span>
                        <span className="flex items-center text-stone-700 font-semibold group-hover:text-orange-600 transition-colors">
                          詳細 <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-stone-50 rounded-xl p-3.5 text-center text-xs text-stone-400 border border-dashed border-stone-200">
                  同じエリアやジャンルの他の登録店がまだありません。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
