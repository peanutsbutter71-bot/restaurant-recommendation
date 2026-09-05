import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { RestaurantSpot } from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyCjHFO2N8Mx9A6R6HOXQ2eVAs8enmFnTus',
  authDomain: 'gourmet-share-64a0a.firebaseapp.com',
  projectId: 'gourmet-share-64a0a',
  storageBucket: 'gourmet-share-64a0a.firebasestorage.app',
  messagingSenderId: '702577817577',
  appId: '1:702577817577:web:8e67d1c88443f9652dbd78',
};

const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LdlBKstAAAAAOc2SufzIBVo2BptE46pHgxhynX2';

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

const db = getFirestore(app);

const SPOTS_COLLECTION = 'spots';

// Fields that are shared publicly via Firestore. Personal fields (favorites,
// visited status, private memo, reactions, etc.) stay device-local only and
// are never written here.
export interface SharedSpotFields {
  id: string;
  name: string;
  area: string;
  nearestStation?: string;
  genres: string[];
  priceRange: RestaurantSpot['priceRange'];
  scenes: RestaurantSpot['scenes'];
  recommender: string;
  comment: string;
  mapUrl?: string;
  tabelogUrl?: string;
  imageUrl?: string;
  highlightDish?: string;
  createdAt: string;
}

function pickSharedFields(spot: RestaurantSpot): Omit<SharedSpotFields, 'id'> {
  const shared: Omit<SharedSpotFields, 'id'> = {
    name: spot.name,
    area: spot.area,
    genres: spot.genres,
    priceRange: spot.priceRange,
    scenes: spot.scenes,
    recommender: spot.recommender,
    comment: spot.comment,
    createdAt: spot.createdAt,
  };
  if (spot.nearestStation) shared.nearestStation = spot.nearestStation;
  if (spot.mapUrl) shared.mapUrl = spot.mapUrl;
  if (spot.tabelogUrl) shared.tabelogUrl = spot.tabelogUrl;
  if (spot.imageUrl) shared.imageUrl = spot.imageUrl;
  if (spot.highlightDish) shared.highlightDish = spot.highlightDish;
  return shared;
}

/**
 * Publishes a brand-new spot to the shared Firestore database so every
 * visitor sees it. Firestore security rules only allow document creation
 * (no update/delete), so this must only be called for spots that don't
 * already exist there.
 */
export async function publishNewSpotToSharedDb(spot: RestaurantSpot): Promise<void> {
  try {
    await setDoc(doc(db, SPOTS_COLLECTION, spot.id), pickSharedFields(spot));
  } catch (e) {
    console.warn('Failed to publish spot to shared Firestore database:', e);
  }
}

/**
 * Subscribes to the shared Firestore spots collection in real time.
 * Returns an unsubscribe function.
 */
export function subscribeToSharedSpots(
  onChange: (spots: SharedSpotFields[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, SPOTS_COLLECTION),
    (snapshot) => {
      const sharedSpots: SharedSpotFields[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SharedSpotFields, 'id'>),
      }));
      onChange(sharedSpots);
    },
    (error) => {
      console.warn('Shared Firestore spots subscription failed:', error);
    }
  );
}
