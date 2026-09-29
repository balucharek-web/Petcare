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
import { storage } from './storage';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (NEVER in localStorage/sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const DRIVE_BACKUP_FILENAME = 'petcare_app_data.json';
const STORAGE_SYNC_META_KEY = 'petcare_drive_sync_metadata';

export interface SyncMetadata {
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'idle';
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  fileId: string | null;
  autoSyncEnabled: boolean;
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
  };
}

function updateSyncMetadata(updates: Partial<SyncMetadata>) {
  const current = getStoredSyncMetadata();
  const updated = { ...current, ...updates };
  localStorage.setItem(STORAGE_SYNC_META_KEY, JSON.stringify(updated));
  listeners.forEach(fn => fn(updated));
}

export function subscribeToSyncUpdates(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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

// Sign in with Google Popup
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

// Sign out
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
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
async function findDriveBackupFile(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const query = encodeURIComponent(`name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Błąd wyszukiwania na Dysku Google (${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      modifiedTime: data.files[0].modifiedTime,
    };
  }
  return null;
}

// Upload current local database to Google Drive
export const uploadPetDataToDrive = async (): Promise<{ success: boolean; fileId: string; timestamp: string }> => {
  let token = await getAccessToken();
  if (!token) {
    // If not in cache, prompt login
    const loginResult = await googleSignIn();
    token = loginResult.accessToken;
  }

  const jsonContent = storage.exportAllData();
  const existingFile = await findDriveBackupFile(token);

  let fileId = existingFile?.id;

  if (fileId) {
    // Update existing file
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      throw new Error(`Nie udało się zaktualizować pliku na Dysku (${res.status})`);
    }
  } else {
    // Create new file with multipart upload
    const metadata = {
      name: DRIVE_BACKUP_FILENAME,
      mimeType: 'application/json',
      description: 'Kopia zapasowa danych PetCare (synchronizacja między urządzeniami)',
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
      throw new Error(`Nie udało się utworzyć pliku na Dysku Google (${res.status})`);
    }

    const resData = await res.json();
    fileId = resData.id;
  }

  const now = new Date().toISOString();
  updateSyncMetadata({
    fileId,
    lastSyncTime: now,
    lastSyncStatus: 'success',
  });

  return { success: true, fileId: fileId!, timestamp: now };
};

// Download backup from Google Drive and restore to local storage
export const downloadPetDataFromDrive = async (): Promise<{ success: boolean; petCount: number; timestamp: string }> => {
  let token = await getAccessToken();
  if (!token) {
    const loginResult = await googleSignIn();
    token = loginResult.accessToken;
  }

  const existingFile = await findDriveBackupFile(token);
  if (!existingFile) {
    throw new Error('Na Twoim Dysku Google nie znaleziono jeszcze zapisanych danych aplikacji PetCare.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Błąd pobierania danych z Dysku (${res.status})`);
  }

  const rawJson = await res.text();
  const success = storage.importAllData(rawJson);

  if (!success) {
    throw new Error('Plik na Dysku Google ma nieprawidłowy format danych.');
  }

  const pets = storage.getPets();
  const now = new Date().toISOString();
  updateSyncMetadata({
    fileId: existingFile.id,
    lastSyncTime: now,
    lastSyncStatus: 'success',
  });

  return {
    success: true,
    petCount: pets.length,
    timestamp: now,
  };
};

// Check if automatic daily sync is due (once every 24h)
export const checkDailyAutoSync = async (): Promise<boolean> => {
  const meta = getStoredSyncMetadata();
  if (!meta.autoSyncEnabled || !auth.currentUser || !cachedAccessToken) {
    return false;
  }

  const lastSync = meta.lastSyncTime ? new Date(meta.lastSyncTime).getTime() : 0;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (now - lastSync > ONE_DAY_MS) {
    try {
      await uploadPetDataToDrive();
      return true;
    } catch (e) {
      console.warn('Cicha synchronizacja w tle nie powiodła się:', e);
      return false;
    }
  }

  return false;
};
