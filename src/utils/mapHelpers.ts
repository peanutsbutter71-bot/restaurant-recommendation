import { RestaurantSpot } from '../types';

// Area center coordinates dictionary (Tokyo, Kanagawa, Kansai & major areas)
export const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '表参道': { lat: 35.6653, lng: 139.7123 },
  '青山': { lat: 35.6685, lng: 139.7188 },
  '原宿': { lat: 35.6702, lng: 139.7027 },
  '渋谷': { lat: 35.6595, lng: 139.7005 },
  '新宿': { lat: 35.6909, lng: 139.7003 },
  '新大久保': { lat: 35.7013, lng: 139.7002 },
  '高田馬場': { lat: 35.7127, lng: 139.7037 },
  '恵比寿': { lat: 35.6467, lng: 139.7101 },
  '中目黒': { lat: 35.6442, lng: 139.6987 },
  '代官山': { lat: 35.6491, lng: 139.7033 },
  '下北沢': { lat: 35.6618, lng: 139.6672 },
  '三軒茶屋': { lat: 35.6435, lng: 139.6713 },
  '銀座': { lat: 35.6712, lng: 139.7656 },
  '有楽町': { lat: 35.6750, lng: 139.7631 },
  '丸の内': { lat: 35.6812, lng: 139.7671 },
  '東京駅': { lat: 35.6812, lng: 139.7671 },
  '六本木': { lat: 35.6628, lng: 139.7314 },
  '麻布十番': { lat: 35.6548, lng: 139.7369 },
  '赤坂': { lat: 35.6724, lng: 139.7363 },
  '池袋': { lat: 35.7295, lng: 139.7109 },
  '吉祥寺': { lat: 35.7022, lng: 139.5798 },
  '荻窪': { lat: 35.7045, lng: 139.6201 },
  '中野': { lat: 35.7058, lng: 139.6658 },
  '秋葉原': { lat: 35.6983, lng: 139.7731 },
  '神田': { lat: 35.6917, lng: 139.7708 },
  '上野': { lat: 35.7141, lng: 139.7774 },
  '浅草': { lat: 35.7148, lng: 139.7967 },
  '蔵前': { lat: 35.7038, lng: 139.7915 },
  '清澄白河': { lat: 35.6814, lng: 139.7997 },
  '門前仲町': { lat: 35.6719, lng: 139.7966 },
  '品川': { lat: 35.6284, lng: 139.7387 },
  '目黒': { lat: 35.6340, lng: 139.7158 },
  '五反田': { lat: 35.6264, lng: 139.7234 },
  '自由が丘': { lat: 35.6074, lng: 139.6687 },
  '二子玉川': { lat: 35.6115, lng: 139.6272 },
  '横浜': { lat: 35.4658, lng: 139.6227 },
  'みなとみらい': { lat: 35.4578, lng: 139.6324 },
  '川崎': { lat: 35.5308, lng: 139.7029 },
  '鎌倉': { lat: 35.3190, lng: 139.5504 },
  '京都': { lat: 35.0116, lng: 135.7681 },
  '大阪': { lat: 34.7024, lng: 135.4959 },
  '難波': { lat: 34.6669, lng: 135.5003 },
  '梅田': { lat: 34.7024, lng: 135.4959 },
  '福岡': { lat: 33.5902, lng: 130.4017 },
  '天神': { lat: 33.5916, lng: 130.3989 },
  '博多': { lat: 33.5902, lng: 130.4207 },
  '札幌': { lat: 43.0618, lng: 141.3545 },
  '名古屋': { lat: 35.1709, lng: 136.8815 },
  '栄': { lat: 35.1687, lng: 136.9088 },
};

const DEFAULT_CENTER = { lat: 35.6684, lng: 139.7058 }; // Tokyo Shibuya/Omotesando center

/**
 * Parses a query string from Google Maps URL or fallback to Name + Area
 */
export function extractQueryForMap(spot: RestaurantSpot): string {
  if (spot.mapUrl) {
    try {
      const url = new URL(spot.mapUrl);
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (q) return q;

      // check place path
      const placeMatch = url.pathname.match(/\/place\/([^/@]+)/);
      if (placeMatch && placeMatch[1]) {
        return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      }
    } catch {
      // invalid URL format, ignore
    }
  }
  return `${spot.name} ${spot.area || ''}`.trim();
}

/**
 * Returns Google Maps Embed URL for iframe preview
 */
export function getGoogleMapsEmbedUrl(spot: RestaurantSpot): string {
  const query = extractQueryForMap(spot);
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Returns direct Google Maps link for navigation / external opening
 */
export function getGoogleMapsNavigationUrl(spot: RestaurantSpot): string {
  if (spot.mapUrl && spot.mapUrl.startsWith('http')) {
    return spot.mapUrl;
  }
  const query = `${spot.name} ${spot.area || ''}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Deterministically generates slight coordinate offsets based on spot.id so
 * multiple restaurants in the same area (e.g. '渋谷') do not completely overlap.
 */
function getDeterministicOffset(id: string): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }

  // Generate radius between 0.001 and 0.004 degrees (~100m to 400m)
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const dist = 0.0012 + (Math.abs(hash >> 3) % 100) * 0.000025;

  return {
    dLat: Math.sin(angle) * dist,
    dLng: Math.cos(angle) * dist * 1.2,
  };
}

/**
 * Returns estimated latitude & longitude for a spot
 */
export function getSpotCoordinates(spot: RestaurantSpot): { lat: number; lng: number } {
  // Check if mapUrl has lat/lng embedded
  if (spot.mapUrl) {
    const latLngMatch = spot.mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (latLngMatch) {
      const lat = parseFloat(latLngMatch[1]);
      const lng = parseFloat(latLngMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // Find by area key
  const areaKey = Object.keys(AREA_COORDINATES).find(
    (k) => spot.area && (spot.area.includes(k) || k.includes(spot.area))
  );

  const base = areaKey ? AREA_COORDINATES[areaKey] : DEFAULT_CENTER;
  const offset = getDeterministicOffset(spot.id);

  return {
    lat: base.lat + offset.dLat,
    lng: base.lng + offset.dLng,
  };
}
