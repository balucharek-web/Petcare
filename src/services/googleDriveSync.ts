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

const DRIVE_BACKUP_FILENAME = 'petcare_app_data.json';
const STORAGE_SYNC_META_KEY = 'petcare_drive_sync_metadata';

export interface SyncMetadata {
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'idle' | 'syncing';
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  fileId: string | null;
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
}

// Find all candidate PetCare backup files on Google Drive (drive space first, then appDataFolder)
export async function findAllDriveBackupFiles(token?: string): Promise<DriveBackupFile[]> {
  const authToken = token || await getAccessToken();
  if (!authToken) return [];

  const foundFiles: DriveBackupFile[] = [];
  const seenIds = new Set<string>();

  // Use targeted, syntax-safe queries on spaces=drive first (which is always permitted by drive.file scope)
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

// Upload current local database to Google Drive (ONLY Google Drive, no server DB)
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
    // Robust 2-step file creation: 1. Metadata -> 2. Media Upload
    try {
      const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          name: DRIVE_BACKUP_FILENAME,
          mimeType: 'application/json',
          description: 'Prywatna baza danych aplikacji PetCare (zwierzaki, szczepienia, leki, wizyty)',
        }),
      });

      if (!createMetaRes.ok) {
        const errText = await createMetaRes.text().catch(() => '');
        throw new Error(`Nie udało się utworzyć pliku na Dysku Google (${createMetaRes.status}): ${errText}`);
      }

      const createdFile = await createMetaRes.json();
      fileId = createdFile.id;

      // Upload JSON content into the newly created file
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
 * Jeśli użytkownik nie ma jeszcze własnych zwierzaków (np. 0 zwierzaków lub tylko domyślny demo zwierzak),
 * pobiera kopię z Dysku Google.
 */
export async function autoRestoreFromDriveIfEmpty(token?: string): Promise<{ restored: boolean; petCount: number; timestamp?: string }> {
  try {
    const localPets = storage.getPets();
    const isOnlyDemoOrEmpty = localPets.length === 0 || 
      (localPets.length === 1 && (localPets[0].id === 'pet-1' || localPets[0].id === 'pet-bono-sample'));

    if (!isOnlyDemoOrEmpty) {
      // User already has real custom data locally, no automatic overwriting
      return { restored: false, petCount: localPets.length };
    }

    const authToken = token || await getAccessToken();
    if (!authToken) {
      return { restored: false, petCount: 0 };
    }

    const restoreResult = await downloadPetDataFromDrive(authToken);
    return {
      restored: true,
      petCount: restoreResult.petCount,
      timestamp: restoreResult.timestamp,
    };
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

