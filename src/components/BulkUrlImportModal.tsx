import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { RestaurantSpot, CustomFolder } from '../types';
import {
  parseSharedUrlOrText,
  extractUrlsFromText,
  checkSpotDuplicate,
  DuplicateConfidence,
} from '../utils/aiShareImport';

export interface BulkImportItem {
  id: string;
  url: string;
  status: 'pending' | 'success' | 'failed' | 'duplicate_exact' | 'duplicate_candidate';
  spot?: Partial<RestaurantSpot>;
  isSelected: boolean;
  duplicateMatchedName?: string;
  confidence?: DuplicateConfidence;
  errorMessage?: string;
  editingName?: string;
}

interface BulkUrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSpots: RestaurantSpot[];
  folders: CustomFolder[];
  onBatchImport: (newSpots: Partial<RestaurantSpot>[], folderName?: string) => void;
  onShowToast: (msg: string) => void;
  onOpenMyPage?: () => void;
}

type Step = 'input' | 'parsing' | 'review' | 'summary';

export const BulkUrlImportModal: React.FC<BulkUrlImportModalProps> = ({
  isOpen,
  onClose,
  existingSpots,
  folders,
  onBatchImport,
  onShowToast,
  onOpenMyPage,
}) => {
  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [extractedUrls, setExtractedUrls] = useState<string[]>([]);
  const [items, setItems] = useState<BulkImportItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState<{
    addedCount: number;
    duplicateSkippedCount: number;
    failedCount: number;
  }>({ addedCount: 0, duplicateSkippedCount: 0, failedCount: 0 });

  if (!isOpen) return null;

  const handleExtractAndStartParse = async () => {
    const urls = extractUrlsFromText(rawText);
    if (urls.length === 0) {
      onShowToast('⚠️ 有効なHTTP/HTTPS URLが見つかりませんでした');
      return;
    }

    setExtractedUrls(urls);
    setStep('parsing');
    setIsParsing(true);
    setCurrentIndex(0);

    const parsedItems: BulkImportItem[] = [];

    // Process URLs in sequential queue
    for (let i = 0; i < urls.length; i++) {
      setCurrentIndex(i + 1);
      const url = urls[i];
      const itemId = `bulk-${i}-${Date.now()}`;

      try {
        const res = await parseSharedUrlOrText(url);
        const spot = res.spot || {};
        spot.mapUrl = spot.mapUrl || (url.includes('google') ? url : undefined);
        spot.tabelogUrl = spot.tabelogUrl || (url.includes('tabelog') ? url : undefined);

        // Run Priority Duplicate Detection against existing database
        const dupCheck = checkSpotDuplicate(spot, existingSpots, url);

        let status: BulkImportItem['status'] = 'success';
        let isSelected = true;

        if (dupCheck.confidence === 'url_match' || dupCheck.confidence === 'id_match') {
          status = 'duplicate_exact';
          isSelected = false; // Exclude exact duplicates by default
        } else if (dupCheck.confidence === 'name_area_match') {
          status = 'duplicate_candidate';
          isSelected = true; // Keep candidate selected but show warning badge
        }

        parsedItems.push({
          id: itemId,
          url,
          status,
          spot,
          isSelected,
          confidence: dupCheck.confidence,
          duplicateMatchedName: dupCheck.matchedSpot?.name,
        });
      } catch {
        // Failed parse
        parsedItems.push({
          id: itemId,
          url,
          status: 'failed',
          isSelected: false,
          errorMessage: '店舗情報を取得できませんでした',
        });
      }
    }

    setItems(parsedItems);
    setIsParsing(false);
    setStep('review');
  };

  const handleRetrySingleItem = async (index: number) => {
    const targetItem = items[index];
    if (!targetItem) return;

    onShowToast(`🔄 「${targetItem.url.slice(0, 30)}...」を再解析中...`);

    try {
      const res = await parseSharedUrlOrText(targetItem.url);
      const spot = res.spot || {};
      spot.mapUrl = spot.mapUrl || (targetItem.url.includes('google') ? targetItem.url : undefined);
      spot.tabelogUrl = spot.tabelogUrl || (targetItem.url.includes('tabelog') ? targetItem.url : undefined);

      const dupCheck = checkSpotDuplicate(spot, existingSpots, targetItem.url);
      let status: BulkImportItem['status'] = 'success';
      let isSelected = true;

      if (dupCheck.confidence === 'url_match' || dupCheck.confidence === 'id_match') {
        status = 'duplicate_exact';
        isSelected = false;
      } else if (dupCheck.confidence === 'name_area_match') {
        status = 'duplicate_candidate';
        isSelected = true;
      }

      setItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                status,
                spot,
                isSelected,
                errorMessage: undefined,
                confidence: dupCheck.confidence,
                duplicateMatchedName: dupCheck.matchedSpot?.name,
              }
            : item
        )
      );
      onShowToast('✨ 解析に成功しました！');
    } catch {
      onShowToast('❌ 再解析に失敗しました。手動で店名を入力してください。');
    }
  };

  const handleSaveManualEdit = (index: number, name: string) => {
    if (!name.trim()) return;

    const targetItem = items[index];
    const newSpot: Partial<RestaurantSpot> = {
      name: name.trim(),
      area: '都内',
      genres: ['グルメ'],
      priceRange: '1000〜3000円',
      scenes: ['女子会'],
      recommender: '一括登録',
      comment: `一括インポートから登録`,
      mapUrl: targetItem.url.includes('google') ? targetItem.url : undefined,
      tabelogUrl: targetItem.url.includes('tabelog') ? targetItem.url : undefined,
    };

    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              status: 'success',
              spot: newSpot,
              isSelected: true,
              errorMessage: undefined,
            }
          : item
      )
    );

    onShowToast(`✏️ 「${name}」として登録対象に追加しました`);
  };

  const handleToggleItemSelect = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleExecuteBatchImport = () => {
    const selectedItems = items.filter((item) => item.isSelected && item.spot && item.spot.name);
    const skippedDuplicateCount = items.filter((item) => item.status === 'duplicate_exact' && !item.isSelected).length;
    const failedCount = items.filter((item) => item.status === 'failed' && !item.isSelected).length;

    if (selectedItems.length === 0) {
      onShowToast('⚠️ 登録する店舗が選択されていません');
      return;
    }

    const spotsToImport = selectedItems.map((item) => item.spot as Partial<RestaurantSpot>);
    onBatchImport(spotsToImport, selectedFolder || undefined);

    setSummaryStats({
      addedCount: selectedItems.length,
      duplicateSkippedCount: skippedDuplicateCount,
      failedCount,
    });

    setStep('summary');
  };

  const handleInsertDemoUrls = () => {
    const demo = `https://tabelog.com/tokyo/A1306/A130602/13245678/\nhttps://maps.app.goo.gl/sample1\nhttps://tabelog.com/tokyo/A1307/A130701/13999999/`;
    setRawText(demo);
  };

  const selectedCount = items.filter((i) => i.isSelected && i.spot?.name).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#E8ECE8] text-[#2D4B3E]">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-stone-900">複数店舗の一括登録</h2>
              <p className="text-[11px] text-stone-500">Google Maps・食べログのURLをまとめて保存</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: INPUT */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>5〜20件のURLをまとめて貼り付けできます</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  LINEやメモ帳にあるGoogleマップ・食べログ等のURLをそのままコピーして貼り付けてください。
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700">URLテキスト（改行区切り）</label>
                  <button
                    type="button"
                    onClick={handleInsertDemoUrls}
                    className="text-[11px] text-orange-600 font-semibold hover:underline cursor-pointer"
                  >
                    サンプルURLを入力してみる
                  </button>
                </div>
                <textarea
                  rows={7}
                  placeholder={`https://tabelog.com/tokyo/A1306/...\nhttps://maps.app.goo.gl/...\nhttps://tabelog.com/tokyo/A1307/...`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                <span>検出されたURL: {extractUrlsFromText(rawText).length} 件</span>
                <span className="text-[10px]">※重複URLは自動除外されます</span>
              </div>
            </div>
          )}

          {/* STEP 2: PARSING PROGRESS */}
          {step === 'parsing' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#C5D8C5] animate-ping opacity-30" />
                <div className="w-12 h-12 rounded-full bg-[#2D4B3E] text-white flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-stone-900">AIが店舗情報を解析中...</h3>
                <p className="text-xs text-stone-500 mt-1">
                  ({currentIndex} / {extractedUrls.length} 件完了)
                </p>
              </div>

              <div className="w-full max-w-xs mx-auto bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#2D4B3E] h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((currentIndex / extractedUrls.length) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW LIST */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Folder Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <FolderOpen className="w-4 h-4 text-stone-600" />
                  <span>保存先フォルダ（任意）:</span>
                </div>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-900"
                >
                  <option value="">📁 指定なし（マイ手帳全体へ保存）</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.name}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.status === 'failed'
                          ? 'bg-red-50/50 border-red-200'
                          : item.status === 'duplicate_exact'
                          ? 'bg-stone-50 border-stone-200 opacity-60'
                          : item.status === 'duplicate_candidate'
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <input
                          type="checkbox"
                          disabled={item.status === 'failed'}
                          checked={item.isSelected}
                          onChange={() => handleToggleItemSelect(idx)}
                          className="mt-1 w-4 h-4 text-orange-600 rounded cursor-pointer accent-orange-600"
                        />

                        <div className="flex-1 min-w-0">
                          {item.status === 'failed' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                                <span>店舗情報を取得できませんでした</span>
                              </div>
                              <p className="text-[10px] text-stone-500 truncate font-mono">
                                {item.url}
                              </p>

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                  <input
                                    type="text"
                                    placeholder="手動で店名を入力..."
                                    value={item.editingName || ''}
                                    onChange={(e) =>
                                      setItems((prev) =>
                                        prev.map((it, i) =>
                                          i === idx ? { ...it, editingName: e.target.value } : it
                                        )
                                      )
                                    }
                                    className="flex-1 px-2.5 py-1 rounded bg-white border border-red-300 text-xs text-stone-900 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveManualEdit(idx, item.editingName || '')}
                                    disabled={!item.editingName?.trim()}
                                    className="px-2.5 py-1 rounded bg-stone-900 text-white font-bold text-xs disabled:opacity-40"
                                  >
                                    保存
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRetrySingleItem(idx)}
                                  className="px-2 py-1 rounded bg-white border border-stone-200 text-[11px] text-stone-700 hover:bg-stone-50 flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  再解析
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-stone-900">
                                  {item.spot?.name || '店舗名未特定'}
                                </span>

                                {item.spot?.area && (
                                  <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-semibold">
                                    📍 {item.spot.area}
                                  </span>
                                )}

                                {item.status === 'duplicate_exact' && (
                                  <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-bold text-[10px]">
                                    🔄 登録済み
                                  </span>
                                )}

                                {item.status === 'duplicate_candidate' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 flex items-center gap-1">
                                    ⚠️ 重複の可能性あり（{item.duplicateMatchedName}）
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-stone-500 truncate font-mono">
                                {item.url}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY FEEDBACK */}
          {step === 'summary' && (
            <div className="py-6 text-center space-y-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-stone-900">
                  🎉 {summaryStats.addedCount} 件をマイ手帳に追加しました！
                </h3>
                {selectedFolder && (
                  <p className="text-xs font-semibold text-orange-600 mt-1">
                    フォルダ「📁 {selectedFolder}」に保存されました
                  </p>
                )}
              </div>

              {/* Summary Stats breakdown cards */}
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-center">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-lg font-black text-emerald-700">{summaryStats.addedCount}</div>
                  <div className="text-[10px] font-bold text-emerald-800">新規登録成功</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-lg font-black text-stone-700">{summaryStats.duplicateSkippedCount}</div>
                  <div className="text-[10px] font-bold text-stone-600">重複スキップ</div>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-lg font-black text-red-600">{summaryStats.failedCount}</div>
                  <div className="text-[10px] font-bold text-red-800">登録失敗</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExtractAndStartParse}
                disabled={extractUrlsFromText(rawText).length === 0}
                className="px-5 py-2.5 rounded-xl bg-[#2D4B3E] text-white font-bold text-xs hover:bg-[#233B31] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{extractUrlsFromText(rawText).length}件のURLを解析する</span>
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl text-stone-600 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
              >
                ← 戻る
              </button>

              <button
                type="button"
                onClick={handleExecuteBatchImport}
                disabled={selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-[#2D4B3E] hover:bg-[#233B31] text-white font-extrabold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <span>{items.length}件中 {selectedCount}件を一括登録する</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'summary' && (
            <div className="w-full flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenMyPage) onOpenMyPage();
                }}
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 cursor-pointer transition-all shadow-md"
              >
                マイ手帳を見る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
