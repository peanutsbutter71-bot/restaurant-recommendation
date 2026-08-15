import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Link,
  Clipboard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Share2,
  Compass,
  Utensils,
  Camera,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RestaurantSpot } from '../types';
import { parseSharedUrlOrText } from '../utils/aiShareImport';

interface QuickUrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessParsed: (prefilledSpot: Partial<RestaurantSpot>) => void;
  initialShareText?: string;
  onShowToast: (msg: string) => void;
}

export const QuickUrlImportModal: React.FC<QuickUrlImportModalProps> = ({
  isOpen,
  onClose,
  onSuccessParsed,
  initialShareText = '',
  onShowToast,
}) => {
  const [inputText, setInputText] = useState(initialShareText);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  useEffect(() => {
    if (initialShareText) {
      setInputText(initialShareText);
    }
  }, [initialShareText]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        onShowToast('クリップボードの読み取りに対応していないブラウザです');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        onShowToast('クリップボードから貼り付けました📋');
      } else {
        onShowToast('クリップボードが空です');
      }
    } catch {
      onShowToast('クリップボードへのアクセスが許可されていません');
    }
  };

  const handleAnalyzeAndImport = async () => {
    if (!inputText.trim()) {
      setErrorMessage('共有されたURLまたはテキストを入力してください');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await parseSharedUrlOrText(inputText);
      if (result.spot) {
        onShowToast('✨ AIが店舗情報を解析しました！');
        onSuccessParsed(result.spot);
        onClose();
      } else {
        setErrorMessage('店舗情報の解析ができませんでした。URLをご確認ください。');
      }
    } catch (err: any) {
      console.error('Share parse error:', err);
      setErrorMessage(err.message || '解析に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-orange-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-1.5">
                <span>共有リンクからAI自動入力</span>
                <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-semibold border border-stone-200">
                  AI解析
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                食べログ・Googleマップ・InstagramなどのURLを自動解析
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Supported Apps Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-stone-500 mr-1">対応サービス:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Utensils className="w-3 h-3 text-stone-500" />
              食べログ
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Compass className="w-3 h-3 text-stone-500" />
              Googleマップ
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Camera className="w-3 h-3 text-stone-500" />
              Instagram
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              Web記事 / 共有文
            </span>
          </div>

          {/* Text Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Link className="w-3.5 h-3.5 text-stone-500" />
                <span>共有URLまたはテキストを貼り付け</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>クリップボードから貼付</span>
              </button>
            </div>

            <textarea
              id="input-quick-share-text"
              rows={4}
              placeholder="例: 「このカフェ良さそう！ https://tabelog.com/...」 または Googleマップの共有リンク"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition-all resize-none"
            />
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs">
              <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            id="btn-analyze-shared-url"
            type="button"
            onClick={handleAnalyzeAndImport}
            disabled={isLoading || !inputText.trim()}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLoading
                ? 'bg-stone-200 text-stone-500 cursor-wait'
                : !inputText.trim()
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : 'bg-stone-900 hover:bg-stone-800 text-white active:scale-98 shadow-xs'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                <span>AIが店名・エリア・ジャンルを解析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>AIで解析して登録画面を開く</span>
              </>
            )}
          </button>

          {/* PWA / Mobile Share Target Guide (Collapsible) */}
          <div className="pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowPwaGuide(!showPwaGuide)}
              className="w-full flex items-center justify-between text-xs font-medium text-stone-600 hover:text-stone-900 py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-stone-500" />
                <span>スマホの「共有」メニューから直接開く方法（PWA）</span>
              </span>
              {showPwaGuide ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </button>

            {showPwaGuide && (
              <div className="mt-2 p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-[11px] text-stone-600 animate-in fade-in">
                <p className="font-semibold text-stone-800">
                  📱 ホーム画面に追加すると、他アプリの「共有」ボタンから直接このアプリに飛べるようになります
                </p>
                <div className="space-y-1 pl-1">
                  <div>
                    <span className="font-semibold text-stone-800">iPhone (Safari):</span>
                    <p className="text-stone-500">
                      画面下の共有ボタン <Share2 className="w-3 h-3 inline text-stone-700" /> →「<strong>ホーム画面に追加</strong>」をタップ
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-800">Android (Chrome):</span>
                    <p className="text-stone-500">
                      メニュー (︙) →「<strong>アプリをインストール</strong>」または「ホーム画面に追加」をタップ
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
