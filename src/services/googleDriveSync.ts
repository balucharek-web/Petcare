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

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Search for the PetCare backup file on Google Drive
export async function findDriveBackupFile(token?: string): Promise<{ id: string; modifiedTime: string; size?: string } | null> {
  const authToken = token || await getAccessToken();
  if (!authToken) return null;

  try {
    const query = encodeURIComponent(`name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        modifiedTime: data.files[0].modifiedTime,
        size: data.files[0].size,
      };
    }
    return null;
  } catch (e) {
    console.warn('Błąd sprawdzania pliku na Dysku Google:', e);
    return null;
  }
}

// Upload current local database to Google Drive (ONLY Google Drive, no server DB)
export const uploadPetDataToDrive = async (silent = false): Promise<{ success: boolean; fileId: string; timestamp: string }> => {
  const token = await getAccessToken();
  if (!token) {
    if (silent) return { success: false, fileId: '', timestamp: '' };
    throw new Error('Brak aktywnego połączenia z Dyskiem Google. Zaloguj się ponownie.');
  }

  if (!silent) {
    updateSyncMetadata({ lastSyncStatus: 'syncing' });
  }

  const jsonContent = storage.exportAllData();
  const existingFile = await findDriveBackupFile(token);
  let fileId = existingFile?.id;

  if (fileId) {
    // Update existing file content on Google Drive
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      if (!silent) updateSyncMetadata({ lastSyncStatus: 'error' });
      throw new Error(`Nie udało się zapisać zmian na Dysku Google (${res.status})`);
    }
  } else {
    // Create new file with multipart upload on Google Drive
    const metadata = {
      name: DRIVE_BACKUP_FILENAME,
      mimeType: 'application/json',
      description: 'Prywatna baza danych aplikacji PetCare (zwierzaki, szczepienia, leki, wizyty)',
    };

    const boundary = '-------PetCareMultipartBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      if (!silent) updateSyncMetadata({ lastSyncStatus: 'error' });
      throw new Error(`Nie udało się utworzyć pliku na Dysku Google (${res.status})`);
    }

    const resData = await res.json();
    fileId = resData.id;
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
  const token = tokenOverride || await getAccessToken();
  if (!token) {
    throw new Error('Brak autoryzacji Dysku Google. Zaloguj się, aby pobrać kopię.');
  }

  updateSyncMetadata({ lastSyncStatus: 'syncing' });

  const existingFile = await findDriveBackupFile(token);
  if (!existingFile) {
    updateSyncMetadata({ lastSyncStatus: 'idle' });
    throw new Error('Na Twoim Dysku Google nie znaleziono jeszcze zapisanych danych aplikacji PetCare.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    updateSyncMetadata({ lastSyncStatus: 'error' });
    throw new Error(`Błąd pobierania danych z Dysku Google (${res.status})`);
  }

  const rawJson = await res.text();
  const success = storage.importAllData(rawJson);

  if (!success) {
    updateSyncMetadata({ lastSyncStatus: 'error' });
    throw new Error('Plik na Dysku Google ma nieprawidłowy format danych.');
  }

  const pets = storage.getPets();
  const now = new Date().toISOString();
  updateSyncMetadata({
    fileId: existingFile.id,
    lastSyncTime: now,
    lastSyncStatus: 'success',
    petCount: pets.length,
  });

  return {
    success: true,
    petCount: pets.length,
    timestamp: now,
  };
};

/**
 * Automatyczne sprawdzenie i pobranie danych z Dysku Google po reinstalacji aplikacji:
 * Jeśli użytkownik jest zalogowany i na urządzeniu nie ma jeszcze zwierzaków (np. świeża instalacja),
 * a na jego Dysku Google istnieje plik petcare_app_data.json – pobiera go automatycznie!
 */
export async function autoRestoreFromDriveIfEmpty(token?: string): Promise<{ restored: boolean; petCount: number; timestamp?: string }> {
  try {
    const localPets = storage.getPets();
    if (localPets.length > 0) {
      // User already has data locally, no automatic overwriting
      return { restored: false, petCount: localPets.length };
    }

    const authToken = token || await getAccessToken();
    if (!authToken) {
      return { restored: false, petCount: 0 };
    }

    const driveFile = await findDriveBackupFile(authToken);
    if (!driveFile) {
      return { restored: false, petCount: 0 };
    }

    // Found backup file on Drive and 0 pets locally -> automatically download!
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

