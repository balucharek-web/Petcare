/**
 * Robust Native IndexedDB Storage Engine for PetCare.
 * Provides high-capacity, crash-resilient persistence (hundreds of MBs)
 * for pet profiles, medical scans, PDFs, and high-resolution photos,
 * completely bypassing the restrictive 5MB localStorage quota.
 */

const DB_NAME = 'PetCare_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB database open blocked by older version');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? (request.result as string) : null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error persisting key "${key}":`, err);
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        resolve();
      };
    });
  } catch {
    // Ignore error
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        resolve();
      };
    });
  } catch {
    // Ignore error
  }
}

export async function idbGetAll(): Promise<Record<string, string>> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const items: Record<string, string> = {};

      const keyRequest = store.getAllKeys();
      keyRequest.onsuccess = () => {
        const keys = keyRequest.result;
        const valRequest = store.getAll();
        valRequest.onsuccess = () => {
          const values = valRequest.result;
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (typeof k === 'string' && values[i] !== undefined) {
              items[k] = values[i] as string;
            }
          }
          resolve(items);
        };
        valRequest.onerror = () => resolve(items);
      };
      keyRequest.onerror = () => resolve(items);
    });
  } catch {
    return {};
  }
}
