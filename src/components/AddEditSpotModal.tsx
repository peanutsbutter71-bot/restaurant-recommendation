import React, { useState } from 'react';
import {
  X,
  Plus,
  Image as ImageIcon,
  MapPin,
  Tag,
  Wallet,
  Users2,
  UserCheck,
  MessageSquare,
  Sparkles,
  Link,
  Bookmark,
  CheckCircle2,
  Heart,
  MessageSquareHeart,
  Search,
  ExternalLink,
  Check,
  RotateCcw,
  Utensils,
  Globe,
  Compass,
  AlertCircle,
  FolderOpen,
  Lock,
  Store,
} from 'lucide-react';
import {
  RestaurantSpot,
  PriceRange,
  Scene,
  COMMON_AREAS,
  COMMON_GENRES,
  ALL_SCENES,
  ALL_PRICE_RANGES,
  LinkCandidate,
  CustomFolder,
  OperatingStatus,
} from '../types';
import { PRESET_IMAGES } from '../data/initialSpots';
import { getGenreStyle, getSceneStyle } from '../utils/helpers';
import { searchShopLinks } from '../utils/aiLinkSearch';

interface AddEditSpotModalProps {
  initialSpot?: RestaurantSpot | Partial<RestaurantSpot> | null;
  onClose: () => void;
  onSave: (spot: RestaurantSpot) => void;
  isAiPrefilled?: boolean;
  availableFolders?: CustomFolder[];
}

export const AddEditSpotModal: React.FC<AddEditSpotModalProps> = ({
  initialSpot,
  onClose,
  onSave,
  isAiPrefilled = false,
  availableFolders = [],
}) => {
  const initialAreaIsCommon = initialSpot?.area
    ? COMMON_AREAS.includes(initialSpot.area)
    : true;

  const [name, setName] = useState(initialSpot?.name || '');
  const [area, setArea] = useState(
    initialAreaIsCommon ? (initialSpot?.area || '表参道') : 'その他'
  );
  const [customArea, setCustomArea] = useState(
    !initialAreaIsCommon ? (initialSpot?.area || '') : ''
  );
  const [isCustomArea, setIsCustomArea] = useState(!initialAreaIsCommon);

  const [nearestStation, setNearestStation] = useState(
    initialSpot?.nearestStation || ''
  );

  const [genres, setGenres] = useState<string[]>(
    initialSpot?.genres && initialSpot.genres.length > 0
      ? initialSpot.genres
      : ['カフェ']
  );
  const [customGenre, setCustomGenre] = useState('');

  const [priceRange, setPriceRange] = useState<PriceRange>(
    (initialSpot?.priceRange as PriceRange) || '1000〜3000円'
  );

  const [scenes, setScenes] = useState<Scene[]>(
    (initialSpot?.scenes as Scene[]) && initialSpot.scenes.length > 0
      ? (initialSpot.scenes as Scene[])
      : ['女子会']
  );

  const [recommender, setRecommender] = useState(
    initialSpot?.recommender || (isAiPrefilled ? '共有リンク' : '')
  );
  const [highlightDish, setHighlightDish] = useState(
    initialSpot?.highlightDish || ''
  );
  const [comment, setComment] = useState(initialSpot?.comment || '');
  const [mapUrl, setMapUrl] = useState(initialSpot?.mapUrl || '');
  const [tabelogUrl, setTabelogUrl] = useState(initialSpot?.tabelogUrl || '');
  const [imageUrl, setImageUrl] = useState(
    initialSpot?.imageUrl || PRESET_IMAGES[0].url
  );
  const [isCustomImage, setIsCustomImage] = useState(
    initialSpot?.imageUrl ? !PRESET_IMAGES.some(p => p.url === initialSpot.imageUrl) : false
  );

  // New features: Private Memo, Folders, Operating Status
  const [privateMemo, setPrivateMemo] = useState(initialSpot?.privateMemo || '');
  const [selectedFolders, setSelectedFolders] = useState<string[]>(
    initialSpot?.folders || []
  );
  const [operatingStatus, setOperatingStatus] = useState<OperatingStatus>(
    initialSpot?.operatingStatus || 'open'
  );
  const [statusCheckNote, setStatusCheckNote] = useState(
    initialSpot?.statusCheckNote || ''
  );

  // AI Link Search state
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<LinkCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedCandidateId, setAppliedCandidateId] = useState<string | null>(
    null
  );

  const [isFavorite, setIsFavorite] = useState(
    initialSpot?.isFavorite ?? false
  );
  const [isVisited, setIsVisited] = useState(
    initialSpot?.isVisited ?? false
  );
  const [visitedAt, setVisitedAt] = useState(
    initialSpot?.visitedAt || new Date().toISOString().split('T')[0]
  );
  const [myMemo, setMyMemo] = useState(initialSpot?.myMemo || '');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleToggleGenre = (g: string) => {
    if (genres.includes(g)) {
      if (genres.length > 1) {
        setGenres(genres.filter((item) => item !== g));
      }
    } else {
      setGenres([...genres, g]);
    }
  };

  const handleAddCustomGenre = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customGenre.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setCustomGenre('');
    }
  };

  const handleToggleScene = (s: Scene) => {
    if (scenes.includes(s)) {
      if (scenes.length > 1) {
        setScenes(scenes.filter((item) => item !== s));
      }
    } else {
      setScenes([...scenes, s]);
    }
  };

  // AI Link Search handler
  const handleSearchLinks = async () => {
    if (!name.trim()) {
      setErrors((prev) => ({
        ...prev,
        name: 'リンクを自動検索するには店名を入力してください',
      }));
      return;
    }

    const finalArea = isCustomArea ? customArea.trim() : area;
    setIsSearchingLinks(true);
    setSearchError(null);
    setAppliedCandidateId(null);

    try {
      const result = await searchShopLinks(name.trim(), finalArea);
      setLinkCandidates(result.candidates || []);
      setHasSearched(true);
      if (result.warning) {
        setSearchError(result.warning);
      }
    } catch (err: any) {
      console.error('Link search failed:', err);
      setSearchError('リンク検索に失敗しました。直接URLを入力してください。');
      setHasSearched(true);
    } finally {
      setIsSearchingLinks(false);
    }
  };

  // Apply a candidate's URLs
  const handleApplyCandidate = (
    candidate: LinkCandidate,
    type: 'both' | 'map' | 'tabelog' = 'both'
  ) => {
    if (type === 'both' || type === 'map') {
      if (candidate.googleMapsUrl) {
        setMapUrl(candidate.googleMapsUrl);
      }
    }
    if (type === 'both' || type === 'tabelog') {
      if (candidate.tabelogUrl) {
        setTabelogUrl(candidate.tabelogUrl);
      }
    }
    setAppliedCandidateId(candidate.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = '店名を入力してください';
    }

    const finalArea = isCustomArea ? customArea.trim() : area;
    if (!finalArea) {
      newErrors.area = 'エリアを入力してください';
    }

    if (!recommender.trim()) {
      newErrors.recommender = '紹介してくれた人を入力してください（例: ○○先輩）';
    }

    if (!comment.trim()) {
      newErrors.comment = 'おすすめポイントやコメントを入力してください';
    }

    if (genres.length === 0) {
      newErrors.genres = 'ジャンルを少なくとも1つ選択してください';
    }

    if (scenes.length === 0) {
      newErrors.scenes = 'シーンを少なくとも1つ選択してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newSpot: RestaurantSpot = {
      id: initialSpot?.id || `spot-${Date.now()}`,
      name: name.trim(),
      area: finalArea,
      nearestStation: nearestStation.trim() || undefined,
      genres,
      priceRange,
      scenes,
      recommender: recommender.trim(),
      comment: comment.trim(),
      highlightDish: highlightDish.trim() || undefined,
      mapUrl: mapUrl.trim() || undefined,
      tabelogUrl: tabelogUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
      createdAt: initialSpot?.createdAt || new Date().toISOString(),
      isFavorite,
      isVisited,
      visitedAt: isVisited ? (visitedAt || undefined) : undefined,
      myMemo: isVisited ? (myMemo.trim() || undefined) : undefined,
      privateMemo: privateMemo.trim() || undefined,
      folders: selectedFolders.length > 0 ? selectedFolders : undefined,
      operatingStatus,
      statusCheckNote: statusCheckNote.trim() || undefined,
    };

    onSave(newSpot);
  };

  return (
    <div
      id="add-spot-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="add-spot-modal-content"
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">
                {isAiPrefilled
                  ? '共有リンクからAI自動入力'
                  : initialSpot && 'id' in initialSpot
                  ? '店舗情報を編集'
                  : 'おすすめ店を登録'}
              </h2>
              {isAiPrefilled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#2D4B3E] text-white">
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  AI解析済み
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {isAiPrefilled
                ? 'AIが解析した店舗情報です。内容を確認・調整して登録してください。'
                : 'おすすめされた美味しいお店の情報を記録します'}
            </p>
          </div>
          <button
            id="close-add-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Shop Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              店名 <span className="text-[#2D4B3E]">*</span>
            </label>
            <input
              id="input-spot-name"
              type="text"
              placeholder="例: BISTRO MARCHE 表参道"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3.5 py-2 bg-white border ${
                errors.name ? 'border-[#2D4B3E] ring-1 ring-[#2D4B3E]' : 'border-stone-200'
              } rounded-lg text-sm focus:outline-none focus:border-[#2D4B3E]`}
            />
            {errors.name && <p className="text-xs text-[#2D4B3E]">{errors.name}</p>}
          </div>

          {/* Recommender */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-stone-500" />
              おすすめしてくれた人 <span className="text-[#2D4B3E]">*</span>
            </label>
            <input
              id="input-spot-recommender"
              type="text"
              placeholder="例: まりな先輩、友人まい、バイト店長"
              value={recommender}
              onChange={(e) => setRecommender(e.target.value)}
              className={`w-full px-3.5 py-2 bg-white border ${
                errors.recommender ? 'border-[#2D4B3E] ring-1 ring-[#2D4B3E]' : 'border-stone-200'
              } rounded-lg text-sm focus:outline-none focus:border-[#2D4B3E]`}
            />
            {errors.recommender && <p className="text-xs text-[#2D4B3E]">{errors.recommender}</p>}
          </div>

          {/* Area */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              エリア <span className="text-orange-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setIsCustomArea(false);
                    setArea(a);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isCustomArea && area === a
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200/60'
                  }`}
                >
                  {a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomArea(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isCustomArea
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-500 border border-dashed border-stone-300 hover:bg-stone-50'
                }`}
              >
                + その他エリア
              </button>
            </div>
            {isCustomArea && (
              <input
                id="input-custom-area"
                type="text"
                placeholder="エリア名を入力（例: 吉祥寺、鎌倉、三軒茶屋）"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="mt-2 w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
              />
            )}
            {errors.area && <p className="text-xs text-orange-600">{errors.area}</p>}
          </div>

          {/* Nearest Station */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-500" />
              最寄り駅
            </label>
            <input
              id="input-nearest-station"
              type="text"
              placeholder="最寄り駅を入力（例: 表参道駅）"
              value={nearestStation}
              onChange={(e) => setNearestStation(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-900"
            />
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-stone-500" />
              予算・価格帯 <span className="text-orange-600">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_PRICE_RANGES.map((price) => {
                const isSelected = priceRange === price;
                return (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setPriceRange(price)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {price}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genres (Multi-select) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-stone-500" />
              ジャンル（複数選択可） <span className="text-orange-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_GENRES.map((g) => {
                const isSelected = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleToggleGenre(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-100 text-stone-700 border-stone-200/80 hover:bg-stone-200'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* Custom genre add */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="他のジャンルを追加（例: ベーカリー）"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomGenre(e);
                  }
                }}
                className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs flex-1 focus:outline-none focus:border-stone-900"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                追加
              </button>
            </div>
            {errors.genres && <p className="text-xs text-orange-600">{errors.genres}</p>}
          </div>

          {/* Scenes (Multi-select) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5 text-stone-500" />
              おすすめシーン（複数選択可） <span className="text-orange-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SCENES.map((scene) => {
                const isSelected = scenes.includes(scene);
                return (
                  <button
                    key={scene}
                    type="button"
                    onClick={() => handleToggleScene(scene)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-100 text-stone-700 border-stone-200/80 hover:bg-stone-200'
                    }`}
                  >
                    #{scene}
                  </button>
                );
              })}
            </div>
            {errors.scenes && <p className="text-xs text-orange-600">{errors.scenes}</p>}
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
              おすすめポイント・コメント <span className="text-orange-600">*</span>
            </label>
            <textarea
              id="input-spot-comment"
              rows={3}
              placeholder="教えてくれた理由や雰囲気、おすすめの頼み方など..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`w-full px-3.5 py-2 bg-white border ${
                errors.comment ? 'border-orange-500 ring-1 ring-orange-500' : 'border-stone-200'
              } rounded-lg text-sm focus:outline-none focus:border-stone-900`}
            />
            {errors.comment && <p className="text-xs text-orange-600">{errors.comment}</p>}
          </div>

          {/* Links Section: Google Maps & Tabelog with AI Auto-Search */}
          <div className="bg-stone-50 rounded-xl p-4 sm:p-5 border border-stone-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-stone-600" />
                  <span>店舗リンク（Googleマップ・食べログ）</span>
                  <span className="text-[11px] text-stone-400 font-normal">（任意）</span>
                </label>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  店名とエリアから、Googleマップと食べログのURLをAIが自動検索できます
                </p>
              </div>

              {/* Search Links with AI Button */}
              <button
                id="btn-ai-search-links"
                type="button"
                onClick={handleSearchLinks}
                disabled={isSearchingLinks || !name.trim()}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isSearchingLinks
                    ? 'bg-stone-200 text-stone-500 cursor-wait'
                    : !name.trim()
                    ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs active:scale-95'
                }`}
              >
                {isSearchingLinks ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    <span>検索中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>AIでリンク検索</span>
                  </>
                )}
              </button>
            </div>

            {/* Error or Warning Notice */}
            {searchError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{searchError}</span>
              </div>
            )}

            {/* AI Candidates Results Box */}
            {hasSearched && linkCandidates.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-900 text-white">
                      AI検索結果
                    </span>
                    <span className="text-xs font-bold text-stone-800">
                      {linkCandidates.length}件の候補
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500">
                    タップしてURLを反映
                  </span>
                </div>

                <div className="space-y-2">
                  {linkCandidates.map((candidate, idx) => {
                    const isApplied = appliedCandidateId === candidate.id;
                    return (
                      <div
                        key={candidate.id || idx}
                        id={`ai-candidate-${candidate.id}`}
                        className={`p-3 rounded-lg bg-stone-50 border transition-all ${
                          isApplied
                            ? 'border-stone-900 bg-white ring-1 ring-stone-900'
                            : 'border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-stone-900">
                                {candidate.title}
                              </h4>
                              {candidate.sourceType === 'ai_grounded' && (
                                <span className="text-[10px] bg-stone-200 text-stone-700 font-medium px-1.5 py-0.2 rounded">
                                  WEB照合
                                </span>
                              )}
                            </div>
                            {candidate.address && (
                              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                                <span className="truncate">{candidate.address}</span>
                              </p>
                            )}
                            {candidate.description && (
                              <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                                {candidate.description}
                              </p>
                            )}
                          </div>

                          {/* Action button to apply both */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              id={`apply-candidate-${candidate.id}`}
                              type="button"
                              onClick={() => handleApplyCandidate(candidate, 'both')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isApplied
                                  ? 'bg-stone-900 text-white'
                                  : 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-800'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isApplied ? '反映済' : '反映する'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Direct link previews inside candidate */}
                        <div className="mt-2.5 pt-2 border-t border-stone-200 flex flex-wrap items-center gap-2 text-[11px]">
                          {candidate.googleMapsUrl && (
                            <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-md px-2 py-0.5">
                              <Compass className="w-3 h-3 text-stone-500 shrink-0" />
                              <span className="font-medium text-stone-700">Googleマップ:</span>
                              <a
                                href={candidate.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-stone-900 hover:underline flex items-center gap-0.5"
                              >
                                <span>確認</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}

                          {candidate.tabelogUrl && (
                            <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-md px-2 py-0.5">
                              <Utensils className="w-3 h-3 text-stone-500 shrink-0" />
                              <span className="font-medium text-stone-700">食べログ:</span>
                              <a
                                href={candidate.tabelogUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-stone-900 hover:underline flex items-center gap-0.5"
                              >
                                <span>確認</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If searched and 0 candidates */}
            {hasSearched && linkCandidates.length === 0 && !isSearchingLinks && (
              <div className="p-3 rounded-lg bg-stone-100 border border-stone-200 text-center space-y-0.5">
                <p className="text-xs font-semibold text-stone-700">
                  該当するURLが見つかりませんでした
                </p>
                <p className="text-[11px] text-stone-500">
                  下の入力欄にGoogleマップや食べログのURLを手動で貼り付けてください。
                </p>
              </div>
            )}

            {/* Manual URL Input Fields */}
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-stone-500" />
                    <span>GoogleマップのURL</span>
                  </label>
                  {mapUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-stone-700 hover:underline flex items-center gap-0.5"
                      >
                        <span>開く</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setMapUrl('')}
                        className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        クリア
                      </button>
                    </div>
                  )}
                </div>
                <input
                  id="input-spot-map"
                  type="url"
                  placeholder="https://maps.app.goo.gl/... または Google Map の共有URL"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-stone-500" />
                    <span>食べログのURL</span>
                  </label>
                  {tabelogUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={tabelogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-stone-700 hover:underline flex items-center gap-0.5"
                      >
                        <span>開く</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setTabelogUrl('')}
                        className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        クリア
                      </button>
                    </div>
                  )}
                </div>
                <input
                  id="input-spot-tabelog"
                  type="url"
                  placeholder="https://tabelog.com/... または店舗の食べログURL"
                  value={tabelogUrl}
                  onChange={(e) => setTabelogUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>
          </div>

          {/* Image Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
              カバー写真
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setIsCustomImage(false);
                    setImageUrl(preset.url);
                  }}
                  className={`group relative aspect-[4/3] rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    !isCustomImage && imageUrl === preset.url
                      ? 'border-stone-900 ring-2 ring-stone-900'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center p-1">
                    <span className="text-[10px] font-semibold text-white text-center leading-tight">
                      {preset.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom image URL toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCustomImage(!isCustomImage)}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 cursor-pointer"
              >
                {isCustomImage ? '← プリセットから選択' : '+ 画像URLを直接入力'}
              </button>
              {isCustomImage && (
                <input
                  type="url"
                  placeholder="https://... 画像URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-900"
                />
              )}
            </div>
          </div>

          {/* Visit Status & My Experience Memo Section */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                訪問ステータス
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="status-choice-unvisited"
                  onClick={() => setIsVisited(false)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    !isVisited
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>行きたい (未訪問)</span>
                </button>

                <button
                  type="button"
                  id="status-choice-visited"
                  onClick={() => setIsVisited(true)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isVisited
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>訪問済み (行った)</span>
                </button>
              </div>
            </div>

            {/* If visited, show date & myMemo */}
            {isVisited && (
              <div className="space-y-2.5 pt-2 border-t border-stone-200">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    訪問日（任意）
                  </label>
                  <input
                    id="input-form-visited-at"
                    type="date"
                    value={visitedAt}
                    onChange={(e) => setVisitedAt(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <MessageSquareHeart className="w-3.5 h-3.5 text-stone-500" />
                    訪問メモ・感想（任意）
                  </label>
                  <textarea
                    id="input-form-my-memo"
                    rows={2}
                    placeholder="実際に行ってみた感想や注文したメニュー..."
                    value={myMemo}
                    onChange={(e) => setMyMemo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Favorite toggle option */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-[#2D4B3E] fill-[#2D4B3E]' : 'text-stone-400'}`} />
                お気に入りに追加する
              </span>
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  isFavorite ? 'bg-[#2D4B3E]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                    isFavorite ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 🔒 Private Memo Section */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-700" />
                <span>非公開メモ（自分専用・任意）</span>
              </label>
              <span className="text-[10px] text-stone-500">
                非公開
              </span>
            </div>
            <textarea
              id="input-form-private-memo"
              rows={2}
              placeholder="例: 会計2人で8,000円。予約必須。カウンター席が良い。"
              value={privateMemo}
              onChange={(e) => setPrivateMemo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 resize-none"
            />
          </div>

          {/* 📁 Folder Classification Section */}
          {availableFolders.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-stone-500" />
                <span>所属フォルダ（複数選択可）</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableFolders.map((folder) => {
                  const isSelected = selectedFolders.includes(folder.name);
                  return (
                    <button
                      type="button"
                      key={folder.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFolders(selectedFolders.filter((f) => f !== folder.name));
                        } else {
                          setSelectedFolders([...selectedFolders, folder.name]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span>{isSelected ? '✓ ' : '+ '}</span>
                      <span>{folder.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🏪 Store Operating Status Selector */}
          <div className="space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-stone-600" />
              <span>店舗営業ステータス</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 'open', label: '通常営業中' },
                { val: 'permanently_closed', label: '閉店・閉業' },
                { val: 'temporarily_closed', label: '休業中' },
                { val: 'moved', label: '移転済' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setOperatingStatus(opt.val as OperatingStatus)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    operatingStatus === opt.val
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="submit-spot-btn"
              type="submit"
              className="w-full py-3 rounded-xl bg-[#2D4B3E] hover:bg-[#233B31] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
            >
              {initialSpot && 'id' in initialSpot ? '変更を保存' : 'おすすめ店を登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
