import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  ExternalLink,
  Heart,
  Bookmark,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Navigation,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react';
import { RestaurantSpot } from '../types';
import { getSpotCoordinates, getGoogleMapsNavigationUrl } from '../utils/mapHelpers';
import { getGenreStyle } from '../utils/helpers';

interface SpotMiniMapViewProps {
  spots: RestaurantSpot[];
  selectedSpotId?: string | null;
  onSelectSpot: (spot: RestaurantSpot) => void;
  onToggleFavorite?: (id: string, e?: React.MouseEvent) => void;
  onToggleVisited?: (id: string, e?: React.MouseEvent) => void;
}

export const SpotMiniMapView: React.FC<SpotMiniMapViewProps> = ({
  spots,
  selectedSpotId,
  onSelectSpot,
  onToggleFavorite,
  onToggleVisited,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [activeSpot, setActiveSpot] = useState<RestaurantSpot | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'voyager' | 'osm'>('osm');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Avoid double initialization
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [35.6684, 139.7058], // Tokyo default
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.control
        .zoom({
          position: 'bottomright',
        })
        .addTo(map);

      // Attribution
      L.control
        .attribution({
          position: 'bottomleft',
          prefix: false,
        })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
        .addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if container is unmounted completely
    };
  }, []);

  // Update Tile Layer when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Both styles use API-key-free tile providers. CartoDB's basemaps.cartocdn.com
    // now requires an API key (was showing "API KEY REQUIRED" watermarks in
    // production), so 'voyager' uses OSM's Humanitarian style tiles instead, which
    // stay free/keyless and give a visually distinct alternative to plain OSM.
    const tileUrl =
      mapStyle === 'voyager'
        ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);
  }, [mapStyle]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.keys(markersRef.current).forEach((id) => {
      const marker = markersRef.current[id];
      if (marker) {
        marker.remove();
      }
    });
    markersRef.current = {};

    if (spots.length === 0) return;

    const bounds = L.latLngBounds([]);

    spots.forEach((spot) => {
      const { lat, lng } = getSpotCoordinates(spot);
      const latLng = L.latLng(lat, lng);
      bounds.extend(latLng);

      const isSelected = spot.id === (activeSpot?.id || selectedSpotId);

      // Create Custom HTML Pin Icon
      const pinColor = spot.isVisited
        ? 'bg-emerald-600 border-white text-white'
        : 'bg-amber-500 border-stone-900 text-stone-950';

      const pulseRing = isSelected
        ? '<div class="absolute -inset-2 bg-rose-500/30 rounded-full animate-ping pointer-events-none"></div>'
        : '';

      const favoriteBadge = spot.isFavorite
        ? '<div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xs text-[9px]">♥</div>'
        : '';

      const markerHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-115 z-10'
        }">
          ${pulseRing}
          <div class="w-8 h-8 rounded-full ${pinColor} border-2 shadow-lg flex items-center justify-center font-bold text-xs">
            ${spot.isVisited ? '✓' : '★'}
          </div>
          ${favoriteBadge}
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-stone-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md pointer-events-none z-50">
            ${spot.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-spot-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActiveSpot(spot);
        map.flyTo(latLng, Math.max(map.getZoom(), 14), {
          duration: 0.6,
        });
      });

      markersRef.current[spot.id] = marker;
    });

    // Fit map view bounds if spots exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [spots, selectedSpotId, activeSpot?.id]);

  // Handle activeSpot or selectedSpotId sync
  useEffect(() => {
    if (selectedSpotId) {
      const match = spots.find((s) => s.id === selectedSpotId);
      if (match) {
        setActiveSpot(match);
        const map = mapInstanceRef.current;
        if (map) {
          const { lat, lng } = getSpotCoordinates(match);
          map.flyTo([lat, lng], 15, { duration: 0.5 });
        }
      }
    }
  }, [selectedSpotId, spots]);

  // Fit all spots bounds on button click
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || spots.length === 0) return;

    const bounds = L.latLngBounds([]);
    spots.forEach((spot) => {
      const { lat, lng } = getSpotCoordinates(spot);
      bounds.extend([lat, lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  };

  return (
    <div
      id="mini-map-view-container"
      className={`relative bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shadow-xs transition-all duration-200 ${
        isExpanded ? 'h-[500px] sm:h-[560px]' : 'h-[300px] sm:h-[360px]'
      }`}
    >
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Header / Stats Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-lg border border-stone-200 shadow-xs flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            ミニマップビュー
          </span>
          <span className="text-[11px] text-stone-500 font-normal">
            ({spots.length}店舗)
          </span>
        </div>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-stone-200 shadow-xs text-[11px] pointer-events-auto">
          <span className="flex items-center gap-1 text-stone-700">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            未訪問
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center gap-1 text-stone-700">
            <span className="w-2 h-2 rounded-full bg-stone-800 inline-block" />
            訪問済み
          </span>
        </div>
      </div>

      {/* Top Right Map Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          id="btn-map-fit-all"
          type="button"
          onClick={handleFitAll}
          className="p-1.5 bg-white/95 hover:bg-white text-stone-700 rounded-lg shadow-xs border border-stone-200 transition-all cursor-pointer active:scale-95 text-xs font-semibold flex items-center gap-1"
          title="全体を表示"
        >
          <Navigation className="w-3.5 h-3.5 text-stone-700" />
          <span className="hidden sm:inline">全体表示</span>
        </button>

        <button
          id="btn-map-switch-style"
          type="button"
          onClick={() => setMapStyle(mapStyle === 'voyager' ? 'osm' : 'voyager')}
          className="p-1.5 bg-white/95 hover:bg-white text-stone-700 rounded-lg shadow-xs border border-stone-200 transition-all cursor-pointer active:scale-95"
          title="地図デザイン切り替え"
        >
          <Layers className="w-3.5 h-3.5 text-stone-700" />
        </button>

        <button
          id="btn-map-expand-toggle"
          type="button"
          onClick={() => {
            setIsExpanded(!isExpanded);
            setTimeout(() => {
              mapInstanceRef.current?.invalidateSize();
            }, 250);
          }}
          className="p-1.5 bg-white/95 hover:bg-white text-stone-700 rounded-lg shadow-xs border border-stone-200 transition-all cursor-pointer active:scale-95"
          title={isExpanded ? 'ミニ表示に戻す' : 'マップを拡大'}
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-stone-700" /> : <Maximize2 className="w-3.5 h-3.5 text-stone-700" />}
        </button>
      </div>

      {/* Selected Spot Bottom Floating Card */}
      {activeSpot && (
        <div
          id="map-selected-spot-card"
          className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-sm z-20 bg-white/98 backdrop-blur-md rounded-xl p-3 shadow-lg border border-stone-200 animate-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.2 rounded bg-stone-100 text-[10px] font-medium text-stone-700 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-orange-600" />
                  {activeSpot.area}
                </span>
                {activeSpot.genres.slice(0, 2).map((g) => {
                  const style = getGenreStyle(g);
                  return (
                    <span
                      key={g}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${style.bg} ${style.text}`}
                    >
                      {g}
                    </span>
                  );
                })}
                {activeSpot.isVisited ? (
                  <span className="px-1.5 py-0.2 rounded bg-stone-800 text-stone-200 text-[10px] font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> 訪問済み
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 text-[10px] font-medium flex items-center gap-0.5">
                    <Bookmark className="w-2.5 h-2.5 text-orange-600" /> 行きたい
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                {activeSpot.name}
              </h4>
              <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                💬 {activeSpot.comment}
              </p>
            </div>

            {/* Thumbnail */}
            {activeSpot.imageUrl && (
              <img
                src={activeSpot.imageUrl}
                alt={activeSpot.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-200"
              />
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <a
                id="map-card-google-maps-link"
                href={getGoogleMapsNavigationUrl(activeSpot)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
                title="Googleマップで開く"
              >
                <ExternalLink className="w-3 h-3 text-stone-600" />
                <span>Googleマップ</span>
              </a>

              {onToggleVisited && (
                <button
                  type="button"
                  onClick={(e) => onToggleVisited(activeSpot.id, e)}
                  className="text-xs font-medium text-stone-500 hover:text-stone-900 p-0.5 rounded transition-colors cursor-pointer"
                  title={activeSpot.isVisited ? '行きたいに戻す' : '行った！にする'}
                >
                  {activeSpot.isVisited ? '未訪問にする' : '行った！'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="map-card-close-btn"
                type="button"
                onClick={() => setActiveSpot(null)}
                className="px-2 py-0.5 text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                閉じる
              </button>

              <button
                id="map-card-view-detail-btn"
                type="button"
                onClick={() => onSelectSpot(activeSpot)}
                className="px-2.5 py-0.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-all cursor-pointer"
              >
                詳細を見る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
