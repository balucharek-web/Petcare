import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { storage, subscribeToStorageChanges } from './storage';
import { Capacitor } from '@capacitor/core';
import { fetchNativeDriveToken } from './nativeGoogleAuth';
import { tryGisOAuthToken } from './gisAuth';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (NEVER in localStorage/sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const DRIVE_BACKUP_FOLDER_NAME = 'petcare_kopiazapasowa';
const DRIVE_BACKUP_FILENAME = 'petcare_app_data.json';
const STORAGE_SYNC_META_KEY = 'petcare_drive_sync_metadata';

export interface SyncMetadata {
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'idle' | 'syncing';
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  fileId: string | null;
  folderId?: string | null;
  autoSyncEnabled: boolean;
  petCount: number;
}

export type SyncEventListener = (meta: SyncMetadata) => void;
const listeners: Set<SyncEventListener> = new Set();

export function getStoredSyncMetadata(): SyncMetadata {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    lastSyncTime: null,
    lastSyncStatus: 'idle',
    userEmail: null,
    userName: null,
    userPhoto: null,
    fileId: null,
    autoSyncEnabled: true,
    petCount: 0,
  };
}

export function updateSyncMetadata(updates: Partial<SyncMetadata>) {
  const current = getStoredSyncMetadata();
  const updated = { ...current, ...updates };
  localStorage.setItem(STORAGE_SYNC_META_KEY, JSON.stringify(updated));
  listeners.forEach(fn => fn(updated));
}

export function subscribeToSyncUpdates(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

// Initialize Auth listener on app load
export const initAuth = (
  onSuccess?: (user: User, token: string) => void,
  onSignedOut?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      updateSyncMetadata({
        userEmail: user.email,
        userName: user.displayName,
        userPhoto: user.photoURL,
      });
      if (cachedAccessToken && onSuccess) {
        onSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      updateSyncMetadata({
        userEmail: null,
        userName: null,
        userPhoto: null,
      });
      if (onSignedOut) onSignedOut();
    }
  });
};

// Sign in with Google Popup (requests Google Drive scopes)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Nie udało się uzyskać tokenu dostępu z konta Google');
    }

    cachedAccessToken = credential.accessToken;
    updateSyncMetadata({
      userEmail: result.user.email,
      userName: result.user.displayName,
      userPhoto: result.user.photoURL,
      lastSyncStatus: 'idle',
    });

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      console.warn('Firebase auth/unauthorized-domain w googleDriveSync. Próba logowania przez GIS...');
      try {
        const gisResult = await tryGisOAuthToken();
        if (gisResult && gisResult.accessToken) {
          cachedAccessToken = gisResult.accessToken;
          const mockUser: any = {
            email: gisResult.email,
            displayName: gisResult.name,
            photoURL: gisResult.photoUrl,
            uid: 'gis_' + gisResult.email,
          };
          updateSyncMetadata({
            userEmail: gisResult.email,
            userName: gisResult.name,
            userPhoto: gisResult.photoUrl,
            lastSyncStatus: 'idle',
          });
          return { user: mockUser, accessToken: gisResult.accessToken };
        }
      } catch (gisErr) {
        console.warn('Błąd fallbacku GIS w googleDriveSync:', gisErr);
      }
    }

    console.error('Błąd logowania Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out from Google & clear memory cache
export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  updateSyncMetadata({
    userEmail: null,
    userName: null,
    userPhoto: null,
    lastSyncStatus: 'idle',
  });
};

export const getAccessToken = async (userEmail?: string): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;

  let email = userEmail || getStoredSyncMetadata().userEmail;
  if (!email) {
    try {
      const sessionRaw = localStorage.getItem('petcare_google_cloud_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        email = parsed?.user?.email;
      }
    } catch {}
  }

  if (email && (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android')) {
    try {
      const nativeToken = await fetchNativeDriveToken(email);
      if (nativeToken) {
        cachedAccessToken = nativeToken;
        return nativeToken;
      }
    } catch (e) {
      console.warn('Błąd pobierania natywnego tokenu Dysku Google:', e);
    }
  }

  return cachedAccessToken;
};

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  inDedicatedFolder?: boolean;
}

/**
 * Znajduje istniejący dedykowany folder 'petcare_kopiazapasowa' na Dysku Google.
 */
export async function findDriveBackupFolder(token?: string): Promise<string | null> {
  const authToken = token || await getAccessToken();
  if (!authToken) return null;

  try {
    // 1. Priorytet: folder w katalogu głównym 'Mój dysk'
    const qRoot = "mimeType = 'application/vnd.google-apps.folder' and (name = 'petcare_kopiazapasowa' or name = 'petcare_kopiazaoasowa') and 'root' in parents and trashed = false";
    const urlRoot = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(qRoot)}&fields=files(id,name)&orderBy=createdTime asc&pageSize=5`;
    const resRoot = await fetch(urlRoot, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (resRoot.ok) {
      const dataRoot = await resRoot.json();
      if (dataRoot.files && dataRoot.files.length > 0) {
        return dataRoot.files[0].id;
      }
    }

    // 2. Jeśli nie ma bezpośrednio w root, znajdź dowolny nieusunięty folder
    const q = "mimeType = 'application/vnd.google-apps.folder' and (name = 'petcare_kopiazapasowa' or name = 'petcare_kopiazaoasowa') and trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=createdTime asc&pageSize=5`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.warn('[Google Drive] Błąd wyszukiwania folderu kopii:', err);
  }
  return null;
}

/**
 * Upewnia się, że folder 'petcare_kopiazapasowa' istnieje na Dysku Google użytkownika.
 * Jeśli nie istnieje, tworzy go i zwraca jego ID.
 */
export async function getOrCreateDriveBackupFolder(token?: string): Promise<string | null> {
  const authToken = token || await getAccessToken();
  if (!authToken) return null;

  // 1. Sprawdź czy folder już istnieje
  const existingFolderId = await findDriveBackupFolder(authToken);
  if (existingFolderId) {
    updateSyncMetadata({ folderId: existingFolderId });
    return existingFolderId;
  }

  // 2. Jeśli nie istnieje, utwórz nowy folder bezpośrednio w katalogu głównym ('root') Dysku Google
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        name: DRIVE_BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
        description: 'Folder kopii zapasowych aplikacji PetCare (zwierzaki, szczepienia, leki, wizyty)',
      }),
    });

    if (res.ok) {
      const createdFolder = await res.json();
      console.log(`[Google Drive] Pomyślnie utworzono folder '${DRIVE_BACKUP_FOLDER_NAME}' (ID: ${createdFolder.id})`);
      updateSyncMetadata({ folderId: createdFolder.id });
      return createdFolder.id;
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[Google Drive] Nie udało się utworzyć folderu (${res.status}): ${errText}`);
    }
  } catch (err) {
    console.warn('[Google Drive] Błąd podczas tworzenia folderu kopii:', err);
  }

  return null;
}

// Find all candidate PetCare backup files on Google Drive (sprawdza najpierw folder petcare_kopiazapasowa)
export async function findAllDriveBackupFiles(token?: string): Promise<DriveBackupFile[]> {
  const authToken = token || await getAccessToken();
  if (!authToken) return [];

  const foundFiles: DriveBackupFile[] = [];
  const seenIds = new Set<string>();

  // 1. NAJPIERW przeszukujemy dedykowany folder 'petcare_kopiazapasowa'
  const folderId = await findDriveBackupFolder(authToken);
  if (folderId) {
    try {
      const folderQuery = `'${folderId}' in parents and (name = 'petcare_app_data.json' or name = 'petcare_sync_data.json' or name contains 'petcare' or name contains 'PetCare') and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(folderQuery)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id);
              foundFiles.push({
                id: f.id,
                name: f.name || 'petcare_app_data.json',
                modifiedTime: f.modifiedTime || new Date().toISOString(),
                size: f.size,
                inDedicatedFolder: true,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Google Drive] Błąd wyszukiwania plików w folderze:', e);
    }
  }

  // Jeśli znaleziono plik w dedykowanym folderze, natychmiast go zwracamy
  if (foundFiles.length > 0) {
    return foundFiles;
  }

  // 2. Fallback dla wstecznej kompatybilności: przeszukujemy ogólną przestrzeń spaces=drive
  const queries = [
    "name = 'petcare_app_data.json' and trashed = false",
    "name = 'petcare_sync_data.json' and trashed = false",
    "name contains 'petcare' and trashed = false",
    "name contains 'PetCare' and trashed = false"
  ];

  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id);
              foundFiles.push({
                id: f.id,
                name: f.name || 'petcare_app_data.json',
                modifiedTime: f.modifiedTime || new Date().toISOString(),
                size: f.size,
                inDedicatedFolder: false,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Google Drive search attempt note:', e);
    }

    // If exact filename was found, stop querying broader patterns
    if (foundFiles.length > 0 && (q.includes('petcare_app_data.json') || q.includes('petcare_sync_data.json'))) {
      break;
    }
  }

  // If nothing found in spaces=drive, also try spaces=appDataFolder in case earlier version wrote there
  if (foundFiles.length === 0) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent("name = 'petcare_app_data.json' and trashed = false")}&fields=files(id,name,modifiedTime,size)`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id);
              foundFiles.push({
                id: f.id,
                name: f.name || 'petcare_app_data.json',
                modifiedTime: f.modifiedTime || new Date().toISOString(),
                size: f.size,
              });
            }
          }
        }
      }
    } catch {}
  }

  return foundFiles;
}

// Search for the single most relevant PetCare backup file on Google Drive
export async function findDriveBackupFile(token?: string): Promise<DriveBackupFile | null> {
  const all = await findAllDriveBackupFiles(token);
  return all.length > 0 ? all[0] : null;
}

// Upload current local database to Google Drive (ALWAYS places file inside 'petcare_kopiazapasowa' folder)
export const uploadPetDataToDrive = async (silent = false): Promise<{ success: boolean; fileId: string; timestamp: string }> => {
  let token = await getAccessToken();
  if (!token) {
    const meta = getStoredSyncMetadata();
    let email = meta.userEmail;
    if (!email) {
      try {
        const sessionRaw = localStorage.getItem('petcare_google_cloud_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          email = parsed?.user?.email;
        }
      } catch {}
    }

    if (email && (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android')) {
      token = await fetchNativeDriveToken(email);
      if (token) cachedAccessToken = token;
    }
  }

  if (!token) {
    if (silent) return { success: false, fileId: '', timestamp: '' };
    if (!Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'android') {
      try {
        const loginRes = await googleSignIn();
        token = loginRes.accessToken;
      } catch {}
    }
  }

  if (!token) {
    if (silent) return { success: false, fileId: '', timestamp: '' };
    throw new Error('Brak aktywnego połączenia z Dyskiem Google. Zaloguj się ponownie.');
  }

  if (!silent) {
    updateSyncMetadata({ lastSyncStatus: 'syncing' });
  }

  // 1. Zapewnij istnienie folderu 'petcare_kopiazapasowa' na Dysku Google
  const folderId = await getOrCreateDriveBackupFolder(token);

  const jsonContent = storage.exportAllData();
  const existingFiles = await findAllDriveBackupFiles(token);
  let fileId = existingFiles.length > 0 ? existingFiles[0].id : null;
  let uploadSuccess = false;

  if (fileId) {
    // Attempt updating existing file on Google Drive
    try {
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonContent,
      });

      if (res.ok) {
        uploadSuccess = true;
        // Jeśli plik nie znajdował się jeszcze w folderze 'petcare_kopiazapasowa', przenieś go bezpośrednio do niego
        if (folderId) {
          try {
            const fileMetaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            let prevParents = '';
            if (fileMetaRes.ok) {
              const metaJson = await fileMetaRes.json();
              if (Array.isArray(metaJson.parents)) {
                prevParents = metaJson.parents.join(',');
              }
            }
            if (!prevParents.includes(folderId)) {
              await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}${prevParents ? `&removeParents=${prevParents}` : ''}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
              });
            }
          } catch (moveErr) {
            console.warn('[Google Drive] Move file to folder warning:', moveErr);
          }

          // Wyczyść ewentualny pusty zduplikowany podfolder 'petcare_kopiazapasowa'
          try {
            const nestedQ = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and (name = 'petcare_kopiazapasowa' or name = 'petcare_kopiazaoasowa') and trashed = false`;
            const nestedRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(nestedQ)}&fields=files(id)`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (nestedRes.ok) {
              const nestedData = await nestedRes.json();
              if (nestedData.files && Array.isArray(nestedData.files)) {
                for (const nf of nestedData.files) {
                  await fetch(`https://www.googleapis.com/drive/v3/files/${nf.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                  }).catch(() => {});
                }
              }
            }
          } catch {}
        }
      } else if (res.status === 404) {
        // File was deleted on Drive by user - reset fileId to create a fresh one below
        fileId = null;
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Google Drive] PATCH failed (${res.status}): ${errText}`);
      }
    } catch (patchErr) {
      console.warn('[Google Drive] PATCH network exception:', patchErr);
      fileId = null;
    }
  }

  if (!uploadSuccess || !fileId) {
    // Robust 2-step file creation inside 'petcare_kopiazapasowa' folder
    try {
      const fileMetadata: any = {
        name: DRIVE_BACKUP_FILENAME,
        mimeType: 'application/json',
        description: 'Prywatna baza danych aplikacji PetCare (zwierzaki, szczepienia, leki, wizyty)',
      };
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(fileMetadata),
      });

      if (!createMetaRes.ok) {
        const errText = await createMetaRes.text().catch(() => '');
        throw new Error(`Nie udało się utworzyć pliku na Dysku Google (${createMetaRes.status}): ${errText}`);
      }

      const createdFile = await createMetaRes.json();
      fileId = createdFile.id;

      // Upload JSON content into the newly created file inside the folder
      const uploadMediaRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonContent,
      });

      if (!uploadMediaRes.ok) {
        const errText = await uploadMediaRes.text().catch(() => '');
        throw new Error(`Nie udało się zapisać danych w pliku (${uploadMediaRes.status}): ${errText}`);
      }

      uploadSuccess = true;
    } catch (createErr: any) {
      if (!silent) updateSyncMetadata({ lastSyncStatus: 'error' });
      throw createErr;
    }
  }

  const now = new Date().toISOString();
  const petCount = storage.getPets().length;
  updateSyncMetadata({
    fileId: fileId!,
    folderId: folderId || undefined,
    lastSyncTime: now,
    lastSyncStatus: 'success',
    petCount,
  });

  return { success: true, fileId: fileId!, timestamp: now };
};

// Download backup from Google Drive and restore to local storage
export const downloadPetDataFromDrive = async (tokenOverride?: string): Promise<{ success: boolean; petCount: number; timestamp: string }> => {
  let token = tokenOverride || await getAccessToken();
  if (!token) {
    const meta = getStoredSyncMetadata();
    let email = meta.userEmail;
    if (!email) {
      try {
        const sessionRaw = localStorage.getItem('petcare_google_cloud_session');
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          email = parsed?.user?.email;
        }
      } catch {}
    }

    if (email && (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android')) {
      token = await fetchNativeDriveToken(email);
      if (token) cachedAccessToken = token;
    }
  }

  if (!token) {
    if (!Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'android') {
      try {
        const loginRes = await googleSignIn();
        token = loginRes.accessToken;
      } catch {}
    }
  }

  if (!token) {
    throw new Error('Brak autoryzacji Dysku Google. Zaloguj się ponownie swoim kontem Google.');
  }

  updateSyncMetadata({ lastSyncStatus: 'syncing' });

  const candidateFiles = await findAllDriveBackupFiles(token);
  if (candidateFiles.length === 0) {
    updateSyncMetadata({ lastSyncStatus: 'idle' });
    throw new Error('Na Twoim Dysku Google nie znaleziono pliku kopii PetCare (petcare_app_data.json). Upewnij się, że logujesz się na to samo konto Google, na którym utworzono kopię.');
  }

  let restored = false;
  let restoredFileId = '';
  let restoredPetCount = 0;
  let lastTimestamp = candidateFiles[0].modifiedTime || new Date().toISOString();

  for (const file of candidateFiles) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) continue;

      const rawJson = await res.text();
      const success = storage.importAllData(rawJson);
      const currentPets = storage.getPets();

      if (success && currentPets.length > 0) {
        restored = true;
        restoredFileId = file.id;
        restoredPetCount = currentPets.length;
        if (file.modifiedTime) lastTimestamp = file.modifiedTime;
        break;
      }
    } catch (e) {
      console.warn('Candidate file test error:', file.name, e);
    }
  }

  if (!restored) {
    updateSyncMetadata({ lastSyncStatus: 'error' });
    throw new Error('Plik na Twoim Dysku Google nie zawierał prawidłowych danych zwierzaków.');
  }

  const now = new Date().toISOString();
  updateSyncMetadata({
    fileId: restoredFileId,
    lastSyncTime: lastTimestamp || now,
    lastSyncStatus: 'success',
    petCount: restoredPetCount,
  });

  return {
    success: true,
    petCount: restoredPetCount,
    timestamp: lastTimestamp || now,
  };
};

/**
 * Automatyczne sprawdzenie i pobranie danych z Dysku Google:
 * 1. Zapewnia istnienie folderu 'petcare_kopiazapasowa' na koncie Google użytkownika.
 * 2. Jeśli użytkownik nie ma jeszcze własnych zwierzaków (np. 0 zwierzaków lub tylko demo):
 *    - Szuka kopii zapasowej w folderze 'petcare_kopiazapasowa' (lub ogólnie na dysku).
 *    - Jeśli kopia istnieje, automatycznie przywraca dane zwierzaków.
 *    - Jeśli kopia nie istnieje, folder 'petcare_kopiazapasowa' pozostaje przygotowany na przyszłe zapisy.
 */
export async function autoRestoreFromDriveIfEmpty(token?: string): Promise<{ restored: boolean; petCount: number; timestamp?: string }> {
  try {
    const authToken = token || await getAccessToken();
    if (!authToken) {
      return { restored: false, petCount: 0 };
    }

    // ZAWSZE upewnij się, że dedykowany folder 'petcare_kopiazapasowa' istnieje na Dysku Google użytkownika
    const folderId = await getOrCreateDriveBackupFolder(authToken);
    if (folderId) {
      updateSyncMetadata({ folderId });
    }

    const localPets = storage.getPets();
    const isOnlyDemoOrEmpty = localPets.length === 0 || 
      (localPets.length === 1 && (localPets[0].id === 'pet-1' || localPets[0].id === 'pet-bono-sample'));

    if (!isOnlyDemoOrEmpty) {
      // Użytkownik ma już swoje zwierzaki lokalnie - nie nadpisujemy
      return { restored: false, petCount: localPets.length };
    }

    // Użytkownik nie ma zwierzaka lokalnie - sprawdzamy czy na Dysku Google istnieje kopia
    const candidateFiles = await findAllDriveBackupFiles(authToken);
    if (candidateFiles.length > 0) {
      const restoreResult = await downloadPetDataFromDrive(authToken);
      return {
        restored: true,
        petCount: restoreResult.petCount,
        timestamp: restoreResult.timestamp,
      };
    } else {
      console.log(`[Google Drive] Użytkownik nie posiada zwierzaka. Folder '${DRIVE_BACKUP_FOLDER_NAME}' został przygotowany na Dysku Google.`);
      return { restored: false, petCount: 0 };
    }
  } catch (err) {
    console.warn('Automatyczne przywracanie z Dysku Google nie powiodło się:', err);
    return { restored: false, petCount: 0 };
  }
}


// Debounced auto-save to Google Drive on every data modification
let autoSaveTimer: any = null;
export function scheduleAutoDriveSave(): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      const meta = getStoredSyncMetadata();
      if (!meta.autoSyncEnabled) return;
      const token = await getAccessToken();
      if (!token) return;
      await uploadPetDataToDrive(/* silent */ true);
    } catch (e) {
      console.warn('Cichy automatyczny zapis na Dysk Google:', e);
    }
  }, 2500);
}

// Automatically sync to Google Drive whenever data in storage is changed
try {
  subscribeToStorageChanges((key) => {
    if (
      key.includes('metadata') || 
      key.includes('sync') || 
      key.includes('alerts') || 
      key.includes('theme') || 
      key.includes('token')
    ) {
      return;
    }
    scheduleAutoDriveSave();
  });
} catch {}

