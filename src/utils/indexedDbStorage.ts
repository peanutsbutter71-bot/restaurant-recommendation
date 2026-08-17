import { RestaurantSpot, CustomFolder } from '../types';

const DB_NAME = 'GourmetShareDB';
const DB_VERSION = 1;
const SPOTS_STORE = 'spots';
const FOLDERS_STORE = 'folders';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SPOTS_STORE)) {
        db.createObjectStore(SPOTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Saves all spots asynchronously into IndexedDB to protect against localStorage 5MB limit
 */
export async function saveSpotsToIndexedDb(spots: RestaurantSpot[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(SPOTS_STORE, 'readwrite');
    const store = tx.objectStore(SPOTS_STORE);

    // Clear and batch write
    store.clear();
    for (const spot of spots) {
      store.put(spot);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage:', err);
  }
}

/**
 * Loads all spots asynchronously from IndexedDB
 */
export async function loadSpotsFromIndexedDb(): Promise<RestaurantSpot[] | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(SPOTS_STORE, 'readonly');
    const store = tx.objectStore(SPOTS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result && result.length > 0 ? (result as RestaurantSpot[]) : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB load failed:', err);
    return null;
  }
}

/**
 * Saves all custom folders asynchronously into IndexedDB
 */
export async function saveFoldersToIndexedDb(folders: CustomFolder[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = tx.objectStore(FOLDERS_STORE);

    store.clear();
    for (const folder of folders) {
      store.put(folder);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB folders save failed:', err);
  }
}
