import React from 'react';
import {
  X,
  Sparkles,
  Users2,
  FolderOpen,
  MapPin,
  CheckCircle2,
  Bookmark,
  ArrowRight,
} from 'lucide-react';
import { CollabFolderInvitePayload } from '../utils/collabFolderHelper';
import { getOptimizedImageUrl } from '../utils/helpers';

interface CollabFolderInviteModalProps {
  inviteData: CollabFolderInvitePayload | null;
  onClose: () => void;
  onJoinFolder: (inviteData: CollabFolderInvitePayload) => void;
}

export const CollabFolderInviteModal: React.FC<CollabFolderInviteModalProps> = ({
  inviteData,
  onClose,
  onJoinFolder,
}) => {
  if (!inviteData) return null;

  const { folder, spots, creatorName = '友達' } = inviteData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header Hero */}
        <div className="bg-[#2D4B3E] text-white p-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-3 right-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-200 mx-auto mb-3 shadow-md">
            <Users2 className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 mb-2">
            <Sparkles className="w-3 h-3 text-emerald-200" />
            <span>コラボ手帳への招待</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            {creatorName} さんから<br />コラボ手帳の招待が届きました！
          </h2>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Folder Details */}
          <div className="p-4 rounded-2xl bg-[#F0F3F0] border border-[#D0DAD0] space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#2D4B3E] text-emerald-200">
                <FolderOpen className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-[#2D4B3E] uppercase tracking-wider">
                  フォルダ名
                </span>
                <h3 className="text-base font-bold text-stone-900 leading-tight">
                  📁 {folder.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-[#C5D8C5]">
              <span>共有店舗数:</span>
              <span className="font-extrabold text-[#2D4B3E] text-sm">
                {spots.length} 軒
              </span>
            </div>
          </div>

          {/* Spot Previews */}
          {spots.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>リストに含まれるおすすめ店舗:</span>
                <span className="text-[10px] text-stone-400">事前プレビュー</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {spots.slice(0, 4).map((spot) => (
                  <div
                    key={spot.id}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                      <img
                        src={getOptimizedImageUrl(spot.imageUrl, 200)}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {spot.name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-[#2D4B3E]" />
                        <span>{spot.area} • {spot.priceRange}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {spots.length > 4 && (
                  <div className="text-center text-xs text-stone-400 py-1">
                    ＋他 {spots.length - 4} 軒の美味しいお店
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-stone-500 leading-relaxed text-center bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            参加すると、このフォルダとお互いのおすすめ店舗があなたのGourmetShare手帳に保存されます。
          </p>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            id="join-collab-folder-btn"
            onClick={() => onJoinFolder(inviteData)}
            className="w-full py-3 rounded-2xl bg-[#2D4B3E] hover:bg-[#233B31] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Users2 className="w-4 h-4 text-emerald-200" />
            <span>🤝 コラボ手帳に参加して追加する</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-medium cursor-pointer"
          >
            後で検討する
          </button>
        </div>
      </div>
    </div>
  );
};
