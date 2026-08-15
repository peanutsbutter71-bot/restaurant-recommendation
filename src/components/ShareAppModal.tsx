import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check, Share2, Sparkles, Send, ExternalLink, Heart, UtensilsCrossed } from 'lucide-react';
import { RestaurantSpot } from '../types';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: RestaurantSpot[];
  onShowToast?: (message: string) => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  spots,
  onShowToast,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const appUrl = window.location.href;
  const totalSpots = spots.length;

  // Invite text templates
  const generalInviteText = `【GourmetShare】友達のリアルなおすすめグルメ手帳🍴\n大手メディアの評価点数じゃなく、信頼できる友人や先輩から教えてもらった美味しい店を記録＆共有できるアプリ！\n👉 ${appUrl}`;

  const myRecommendListText = `私が友達から教えてもらった行きたい店・おすすめグルメ手帳（${totalSpots}軒登録中）はこちら🍴✨\n【GourmetShare】で一緒に美味しい店探さない？\n👉 ${appUrl}`;

  const handleCopy = async (text: string, typeKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(typeKey);
      if (onShowToast) onShowToast('📋 共有文面とリンクをコピーしました！');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      if (onShowToast) onShowToast('コピーに失敗しました');
    }
  };

  const handleLineShare = (text: string) => {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  };

  const handleTwitterShare = (text: string) => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleNativeShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GourmetShare - 友達のおすすめグルメ手帳',
          text,
          url: appUrl,
        });
        if (onShowToast) onShowToast('共有メニューを開きました');
      } catch {
        // Cancelled or unsupported
      }
    } else {
      handleCopy(text, 'native');
    }
  };

  return (
    <div
      id="share-app-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="share-app-modal-content"
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 my-auto animate-in zoom-in-95 duration-150 p-5 sm:p-6 flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-orange-400 flex items-center justify-center shadow-xs shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
              <span>友達にGourmetShareを教える</span>
            </h3>
            <p className="text-xs text-stone-500">
              行きたいお店やおすすめグルメ手帳を共有しよう
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Option 1: App Invite Card */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>アプリの紹介（おすすめ招待）</span>
              </span>
              <span className="text-[10px] text-stone-500 font-medium">LINE・SNS向け</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200/80 font-normal">
              「大手メディアの点数じゃなく、信頼できる友達のおすすめを記録できるグルメアプリ使ってみて！🍴」
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLineShare(generalInviteText)}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>LINEで送る</span>
              </button>

              <button
                type="button"
                onClick={() => handleTwitterShare(generalInviteText)}
                className="py-2 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Xでポスト</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(generalInviteText, 'general')}
                className="py-2 px-3 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="文章とリンクをコピー"
              >
                {copiedType === 'general' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                )}
                <span>{copiedType === 'general' ? 'コピー済' : 'コピー'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Share My Gourmet Log */}
          {totalSpots > 0 && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                  <span>私のグルメ手帳（{totalSpots}軒）を自慢・共有</span>
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200/80 font-normal">
                「私が友達から教えてもらった行きたい店リスト（{totalSpots}軒）はこちら🍴 一緒に行かない？」
              </p>

              <button
                type="button"
                onClick={() => handleNativeShare(myRecommendListText)}
                className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-orange-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>自分のグルメリスト文面をシェアする</span>
              </button>
            </div>
          )}

          {/* Footer Note */}
          <p className="text-[11px] text-stone-400 text-center pt-1">
            ※ 友達と一緒に使うと、おすすめの交換やお店選びがさらに楽しくなります。
          </p>
        </div>
      </div>
    </div>
  );
};
