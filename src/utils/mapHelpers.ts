import { RestaurantSpot } from '../types';

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
