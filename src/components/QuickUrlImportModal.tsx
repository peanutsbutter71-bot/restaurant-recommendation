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
import { parseSharedUrlOrText, parseSharedImage } from '../utils/aiShareImport';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';

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
  const [loadingText, setLoadingText] = useState('AI解析中...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialShareText) {
      setInputText(initialShareText);
    }
  }, [initialShareText]);

  // Handle clipboard paste of images
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          processImageFile(file);
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const processImageFile = async (file: File) => {
    setIsLoading(true);
    setLoadingText('📷 AIがスクショ画像から文字を解析中...');
    setErrorMessage(null);

    try {
      onShowToast('📷 画像から店舗情報をAI解析中...');
      const result = await parseSharedImage(file);
      if (result.spot) {
        onShowToast('✨ スクショ画像から店舗情報を自動抽出しました！');
        onSuccessParsed(result.spot);
        onClose();
      } else {
        setErrorMessage('画像から店舗情報を読み取れませんでした。鮮明なスクショ画像をお試しください。');
      }
    } catch (err: any) {
      console.error('Image Vision parse error:', err);
      setErrorMessage(err.message || '画像解析に失敗しました。');
    } finally {
      setIsLoading(false);
      setLoadingText('AI解析中...');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

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
      if (result.spots && result.spots.length > 1) {
        onShowToast(`✨ Googleマップ保存リスト「${result.listTitle || '保存リスト'}」から ${result.spots.length}軒 を一括抽出しました！`);
        onSuccessParsed({
          name: result.listTitle || 'Googleマップ共有リスト',
          comment: `リストから ${result.spots.length}軒 を自動登録`,
        });
        onClose();
      } else if (result.spot) {
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
            <div className="w-8 h-8 rounded-lg bg-[#2D4B3E] flex items-center justify-center text-emerald-200">
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
              className="w-full p-3 bg-white border border-stone-300 rounded-xl text-base sm:text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#2D4B3E] transition-all resize-none"
            />
          </div>

          {/* Image Screenshot Dropzone / File Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-[#2D4B3E]" />
              <span>またはスクショ画像をアップロード・ペースト</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  if (file.type.startsWith('image/')) {
                    processImageFile(file);
                  }
                }
              }}
              className="p-3 border-2 border-dashed border-stone-300 hover:border-[#2D4B3E] rounded-xl bg-stone-50/80 hover:bg-[#E8ECE8]/30 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1 group"
            >
              <UploadCloud className="w-5 h-5 text-stone-400 group-hover:text-[#2D4B3E] transition-colors" />
              <div className="text-xs font-semibold text-stone-700 group-hover:text-[#2D4B3E]">
                📷 スクショ画像を選択・ドラッグ＆ドロップ
              </div>
              <p className="text-[11px] text-stone-400">
                LINEやインスタで届いた食べログ・マップのスクショ（コピペ Ctrl+V にも対応）
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-stone-100 border border-stone-300 text-stone-800 text-xs">
              <AlertCircle className="w-4 h-4 text-[#2D4B3E] shrink-0 mt-0.5" />
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
                : 'bg-[#2D4B3E] hover:bg-[#233B31] text-white active:scale-98 shadow-xs'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                <span>AIが店名・エリア・ジャンルを解析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
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
