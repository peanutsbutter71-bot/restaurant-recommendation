import React, { useState } from 'react';
import { X, Sparkles, FolderPlus, Check, ChevronRight, MapPin, Bookmark, Utensils } from 'lucide-react';
import { STARTER_PACKS, StarterPack } from '../data/starterPacks';

interface StarterPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPack: (pack: StarterPack) => void;
  importedPackIds?: string[];
}

export const StarterPackModal: React.FC<StarterPackModalProps> = ({
  isOpen,
  onClose,
  onImportPack,
  importedPackIds = [],
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>(STARTER_PACKS[0].id);

  if (!isOpen) return null;

  const selectedPack = STARTER_PACKS.find((p) => p.id === selectedPackId) || STARTER_PACKS[0];

  return (
    <div
      id="starter-pack-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="starter-pack-modal-content"
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>厳選スターターパック（1タップ登録）</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-400/30 px-2 py-0.5 rounded-md font-medium">
                  Pivot風フォルダ連動
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                取り込むとマイページ内にPivot風の専用フォルダが自動作成されます
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Pack Selection Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {STARTER_PACKS.map((pack) => {
              const isImported = importedPackIds.includes(pack.id);
              const isSelected = selectedPackId === pack.id;

              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white shadow-md ring-1 ring-stone-900'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: pack.folderColor }}
                      >
                        📁 {pack.folderName}
                      </span>
                      {isImported && (
                        <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> 追加済
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold line-clamp-2 leading-snug mt-1">
                      {pack.title}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] opacity-80">
                    <span>{pack.spots.length}店舗収録</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Pack Detail Card */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-4">
            <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full rounded-lg overflow-hidden bg-stone-900">
              <img
                src={selectedPack.coverImage}
                alt={selectedPack.title}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold shadow-2xs mb-1 inline-block"
                  style={{ backgroundColor: selectedPack.folderColor }}
                >
                  📁 フォルダ名: {selectedPack.folderName}
                </span>
                <h3 className="text-base sm:text-lg font-bold leading-tight">
                  {selectedPack.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-normal bg-white p-3 rounded-lg border border-stone-200/80">
              {selectedPack.description}
            </p>

            {/* Spots Preview List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-orange-600" />
                  収録スポットプレビュー ({selectedPack.spots.length}店舗):
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPack.spots.map((spot, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-lg border border-stone-200/90 flex items-start gap-2.5"
                  >
                    <img
                      src={spot.imageUrl}
                      alt={spot.name}
                      className="w-11 h-11 rounded-md object-cover shrink-0 bg-stone-100"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="text-orange-600 font-semibold flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {spot.area}
                        </span>
                        <span className="text-stone-400 font-medium">{spot.priceRange}</span>
                      </div>
                      <h5 className="text-xs font-bold text-stone-900 truncate mt-0.5">
                        {spot.name}
                      </h5>
                      <p className="text-[10px] text-stone-500 truncate mt-0.5">
                        👤 {spot.recommender}: {spot.comment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Import Button */}
            <button
              type="button"
              onClick={() => {
                onImportPack(selectedPack);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer mt-2"
            >
              <FolderPlus className="w-4 h-4 text-orange-400" />
              <span>「📁 {selectedPack.folderName}」フォルダを作成して手帳に追加</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
