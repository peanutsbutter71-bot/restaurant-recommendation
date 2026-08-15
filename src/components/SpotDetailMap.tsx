import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  Compass,
  Utensils,
} from 'lucide-react';
import { RestaurantSpot } from '../types';
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsNavigationUrl,
  extractQueryForMap,
} from '../utils/mapHelpers';

interface SpotDetailMapProps {
  spot: RestaurantSpot;
  onShowToast: (msg: string) => void;
}

export const SpotDetailMap: React.FC<SpotDetailMapProps> = ({
  spot,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const query = extractQueryForMap(spot);
  const embedUrl = getGoogleMapsEmbedUrl(spot);
  const navUrl = getGoogleMapsNavigationUrl(spot);
  const tabelogUrl =
    spot.tabelogUrl ||
    `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(
      `${spot.name} ${spot.area}`
    )}`;

  const handleCopyLocation = async () => {
    try {
      await navigator.clipboard.writeText(`${spot.name} (${spot.area})`);
      setCopied(true);
      onShowToast('店名とエリアをコピーしました📋');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('コピーに失敗しました');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3.5">
      {/* Header with Title & Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <span>店舗の場所・マップ</span>
              {spot.mapUrl ? (
                <span className="text-[10px] bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-md border border-stone-200">
                  マップ連携済
                </span>
              ) : (
                <span className="text-[10px] bg-stone-100 text-stone-600 font-medium px-2 py-0.5 rounded-md">
                  エリア推定
                </span>
              )}
              {spot.tabelogUrl && (
                <span className="text-[10px] bg-orange-50 text-orange-800 font-medium px-2 py-0.5 rounded-md border border-orange-200">
                  食べログ連携済
                </span>
              )}
            </h3>
            <p className="text-[11px] text-stone-500">
              検索起点: {query}
            </p>
          </div>
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopyLocation}
          className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors"
          title="店名とエリアをコピー"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-stone-800" />
              <span className="text-stone-800 font-medium">コピー完了</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-stone-400" />
              <span>店名をコピー</span>
            </>
          )}
        </button>
      </div>

      {/* Embedded Map Frame */}
      <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
        {!isMapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-2 bg-stone-50 z-0">
            <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">地図を読み込み中...</span>
          </div>
        )}

        <iframe
          id="spot-google-maps-embed"
          title={`${spot.name}の地図`}
          src={embedUrl}
          onLoad={() => setIsMapLoaded(true)}
          className="w-full h-full border-0 relative z-10"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Navigation & External Links Buttons Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-600">
          <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="font-semibold text-stone-800">{spot.area}</span>
          <span className="text-stone-400">周辺</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tabelog link button */}
          <a
            id="btn-open-tabelog-direct"
            href={tabelogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs border border-stone-200 transition-all"
            title="食べログで写真や口コミ・メニューを見る"
          >
            <Utensils className="w-3.5 h-3.5 text-orange-600" />
            <span>食べログ</span>
            <ExternalLink className="w-3 h-3 text-stone-400 ml-0.5" />
          </a>

          {/* Google Maps navigation button */}
          <a
            id="btn-open-google-maps-direct"
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-all shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5 text-stone-300" />
            <span>Googleマップ</span>
            <ExternalLink className="w-3 h-3 text-stone-400 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
