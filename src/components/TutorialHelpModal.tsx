import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Sparkles,
  Share2,
  User,
  Flame,
  Dices,
  ChevronRight,
  ChevronLeft,
  Check,
  Camera,
  Heart,
  ShieldCheck,
} from 'lucide-react';

interface TutorialHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Sparkles,
    color: 'bg-emerald-100 text-[#2D4B3E]',
    title: '1. 共有URL・スクショでAI一発登録',
    subtitle: '入力の手間はゼロ！リンクや画像を貼るだけ',
    description:
      '食べログ、Googleマップ、Instagramの共有リンクやスマホのスクショ画像を貼ると、AIが「正式店舗名・エリア・最寄り駅徒歩分数・予算・地図リンク」を2秒で全自動解析して手帳に記録します。',
    badge: '⚡ AI解析対応',
    preview: (
      <div className="bg-[#E8ECE8]/60 p-3 rounded-2xl border border-[#C5D8C5] text-xs space-y-1.5 font-mono">
        <div className="flex items-center gap-1.5 text-[#2D4B3E] font-bold">
          <Camera className="w-3.5 h-3.5" />
          <span>https://tabelog.com/... またはスクショ画像</span>
        </div>
        <p className="text-stone-600 text-[11px]">
          ➔ ✨ AI解析完了: 「CHAVATY 表参道 (表参道駅徒歩2分 / ¥1,000〜¥2,000)」
        </p>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-800',
    title: '2. 会員登録一切なしの全員リアルタイム共有',
    subtitle: 'メアド・パスワード設定の手間ゼロ！',
    description:
      '会員登録やログインの手間は一切ありません。LINEのリンクをタップするだけで、友人・先輩など身内グループ全員のスマホにデータがリアルタイムで全自動同期されます。',
    badge: '🔒 アカウント登録0%',
    preview: (
      <div className="bg-stone-900 text-white p-3 rounded-2xl text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">🤝 身内全員リアルタイム共有中</span>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">gourmet-share</span>
      </div>
    ),
  },
  {
    icon: User,
    color: 'bg-purple-100 text-purple-800',
    title: '3. 「誰のおすすめ・追加」かが一目で分かる',
    subtitle: '先輩や友達の「推し店舗」がすぐ伝わる',
    description:
      '初回にあなたの名前（例: まりな先輩、あやか）を選ぶだけで、登録したお店に「👤 まりな先輩の追加」バッジが自動付与。〇〇ちゃんの追加店だけに絞り込むことも可能です。',
    badge: '👤 ネームバッジ表示',
    preview: (
      <div className="bg-white p-2.5 rounded-xl border border-stone-200 text-xs flex items-center justify-between shadow-2xs">
        <span className="inline-flex items-center gap-1 bg-[#E8ECE8] text-[#2D4B3E] font-bold px-2.5 py-1 rounded-full text-[11px]">
          👤 まりな先輩の追加
        </span>
        <span className="text-stone-500 text-[11px]">❤️ 3行きたい</span>
      </div>
    ),
  },
  {
    icon: Flame,
    color: 'bg-orange-100 text-orange-800',
    title: '4. Tinder風スワイプで直感的に今日のお店を発見',
    subtitle: '好みを学習する「発見」モード',
    description:
      '「発見」タブでは、保存されたお店がカード形式で出現。右スワイプで「行きたい！」、上スワイプで「絶対行く！」に分類。AIがあなたの好み傾向を学習します。',
    badge: '🔥 直感チョイス',
    preview: (
      <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl text-xs text-orange-900 flex items-center justify-between">
        <span className="font-bold flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          「発見」モードでサクサク直感選出
        </span>
        <span className="text-[10px] bg-orange-200 text-orange-900 font-extrabold px-1.5 py-0.5 rounded">
          右スワイプ👉
        </span>
      </div>
    ),
  },
  {
    icon: Dices,
    color: 'bg-amber-100 text-amber-900',
    title: '5. 迷ったらルーレットでお店を即決！',
    subtitle: '優柔不断なグループの強い味方',
    description:
      '「今日どこ行く？」が決まらない時は、決定アシスタント（ルーレット）におまかせ！現在地周辺やジャンル・予算に合わせて、ぴったりの1店舗をピシッと選出します。',
    badge: '🎲 決定アシスタント',
    preview: (
      <div className="bg-stone-100 border border-stone-300 p-2.5 rounded-xl text-xs text-stone-800 flex items-center justify-between">
        <span className="font-bold flex items-center gap-1">
          <Dices className="w-3.5 h-3.5 text-stone-600" />
          「今日のお店決定アシスタント」
        </span>
        <span className="text-[10px] bg-stone-800 text-white font-extrabold px-2 py-0.5 rounded">
          ルーレット回転！
        </span>
      </div>
    ),
  },
];

export const TutorialHelpModal: React.FC<TutorialHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const IconComp = step.icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#FAF8F5] px-6 py-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2D4B3E] text-emerald-200 flex items-center justify-center shadow-2xs">
              <HelpCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-stone-900">
                GourmetShare 使い方・機能ガイド
              </h2>
              <p className="text-[10px] text-stone-500">
                ステップ {currentStep + 1} / {STEPS.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Slideshow */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step Icon & Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${step.color}`}>
                <IconComp className="w-5.5 h-5.5" />
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                {step.badge}
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                {step.title}
              </h3>
              <p className="text-xs font-semibold text-[#2D4B3E] mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-stone-600 leading-relaxed font-normal bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/80">
            {step.description}
          </p>

          {/* UI Preview Box */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              実際の表示イメージ:
            </label>
            {step.preview}
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex items-center justify-between shrink-0">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? 'w-6 bg-[#2D4B3E]' : 'w-2 bg-stone-300 hover:bg-stone-400'
                }`}
                title={`ステップ ${idx + 1} へ移動`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200/60 transition-all cursor-pointer flex items-center gap-1 border border-stone-300"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>戻る</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2D4B3E] hover:bg-[#233B31] text-white shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-98"
            >
              <span>{currentStep === STEPS.length - 1 ? '使い始める！' : '次へ'}</span>
              {currentStep === STEPS.length - 1 ? (
                <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-emerald-200" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
