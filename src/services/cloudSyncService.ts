import { storage } from './storage';
import { googleSignOut as googleDriveSignOut } from './googleDriveSync';

const STORAGE_SESSION_KEY = 'petcare_google_cloud_session';
const AUTO_SYNC_INTERVAL_HOURS = 24;
const REMOTE_BACKEND_URL = (import.meta as any).env?.VITE_APP_URL || '';

export interface CloudUser {
  email: string;
  name: string;
  avatar?: string;
  provider?: 'google' | 'email';
}

export interface CloudSession {
  user: CloudUser | null;
  authToken?: string;
  lastSyncTime: string | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  autoSync: boolean;
}

export type CloudSyncListener = (session: CloudSession) => void;
const listeners: Set<CloudSyncListener> = new Set();

export function getStoredSession(): CloudSession {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    user: null,
    authToken: undefined,
    lastSyncTime: null,
    lastSyncStatus: 'idle',
    autoSync: true,
  };
}

export function saveSession(updates: Partial<CloudSession>): CloudSession {
  const current = getStoredSession();
  const next: CloudSession = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribeToCloudSync(listener: CloudSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Get the correct API URL (resolves relative paths to the live backend when inside Capacitor Android)
export function getApiUrl(endpoint: string): string {
  if (typeof window === 'undefined') return endpoint;
  const origin = window.location.origin || '';
  if (
    origin.startsWith('capacitor:') || 
    origin.startsWith('file:') ||
    origin.startsWith('android-') ||
    origin === 'null' ||
    !origin.startsWith('http')
  ) {
    if (REMOTE_BACKEND_URL) {
      return `${REMOTE_BACKEND_URL}${endpoint}`;
    }
  }
  return endpoint;
}

// Helper: safe API Call to server
async function safeApiCall(endpoint: string, bodyObj: any): Promise<any> {
  const url = getApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg = data?.error || `Błąd serwera (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Przekroczono limit czasu połączenia z serwerem.');
    }
    throw err;
  }
}

// Bundle local data into exportable structure
export function bundleAllPetData() {
  try {
    return JSON.parse(storage.exportAllData());
  } catch {
    return {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      pets: storage.getPets(),
      vaccinations: storage.getVaccinations(),
      medications: storage.getMedications(),
      exams: storage.getExams(),
      conditions: storage.getConditions(),
      visits: storage.getVisits(),
      activePetId: storage.getActivePetId(),
    };
  }
}

// Restore data into local storage
export function restoreAllPetData(payload: any): { petCount: number } {
  if (!payload || !Array.isArray(payload.pets)) {
    return { petCount: 0 };
  }

  storage.importAllData(JSON.stringify(payload));
  return { petCount: payload.pets.length };
}

// 1. Register with Email + Password
export async function registerWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Wprowadź prawidłowy adres e-mail.');
  }
  if (!password || password.length < 6) {
    throw new Error('Hasło musi zawierać co najmniej 6 znaków.');
  }

  // Clear previous session & data
  storage.clearAllData();

  const authData = await safeApiCall('/api/cloud-sync/auth', {
    email: cleanEmail,
    password,
    name: name || cleanEmail.split('@')[0],
    action: 'register',
    provider: 'email',
  });

  const user: CloudUser = {
    email: cleanEmail,
    name: authData.user?.name || cleanEmail.split('@')[0],
    avatar: authData.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authData.user?.name || cleanEmail)}&background=0D9488&color=fff&bold=true`,
    provider: 'email',
  };

  saveSession({
    user,
    authToken: authData.token,
    lastSyncStatus: 'success',
    lastSyncTime: new Date().toISOString(),
  });

  return { user, petCount: 0 };
}

// 2. Login with Email + Password
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Wprowadź prawidłowy adres e-mail.');
  }
  if (!password) {
    throw new Error('Wprowadź hasło.');
  }

  // Clear previous local data first
  storage.clearAllData();

  const authData = await safeApiCall('/api/cloud-sync/auth', {
    email: cleanEmail,
    password,
    action: 'login',
    provider: 'email',
  });

  const user: CloudUser = {
    email: cleanEmail,
    name: authData.user?.name || cleanEmail.split('@')[0],
    avatar: authData.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authData.user?.name || cleanEmail)}&background=0D9488&color=fff&bold=true`,
    provider: 'email',
  };

  // Restore user's pets from cloud payload
  let petCount = 0;
  if (authData.payload && Array.isArray(authData.payload.pets)) {
    const res = restoreAllPetData(authData.payload);
    petCount = res.petCount;
  }

  saveSession({
    user,
    authToken: authData.token,
    lastSyncStatus: 'success',
    lastSyncTime: authData.lastSyncTime || new Date().toISOString(),
  });

  return { user, petCount };
}

// 3. Sign in / Register with Google
export async function signInWithGoogle(
  email: string,
  displayName?: string,
  avatar?: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Nieprawidłowy adres konta Google.');
  }

  // Clear previous local data first to prevent data mixing
  storage.clearAllData();

  const name = displayName || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
  const user: CloudUser = {
    email: cleanEmail,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`,
    provider: 'google',
  };

  // Register / Authenticate on PetCare Cloud Sync API
  const authData = await safeApiCall('/api/cloud-sync/auth', {
    email: cleanEmail,
    name: user.name,
    avatar: user.avatar,
    provider: 'google',
    action: 'google',
  });

  const authToken = authData.token || '';
  let petCount = 0;

  if (authData.payload && Array.isArray(authData.payload.pets)) {
    const res = restoreAllPetData(authData.payload);
    petCount = res.petCount;
  }

  saveSession({
    user,
    authToken,
    lastSyncStatus: 'success',
    lastSyncTime: authData.lastSyncTime || new Date().toISOString(),
  });

  return { user, petCount };
}

// 4. Sign out: immediately clears all local data and resets session
export function signOut(): void {
  storage.clearAllData();
  saveSession({
    user: null,
    authToken: undefined,
    lastSyncStatus: 'idle',
    lastSyncTime: null,
    autoSync: true,
  });
  googleDriveSignOut().catch(() => {});
}

// Sign out alias for backwards compatibility
export const signOutGoogle = signOut;

// 5. Upload pet data to Cloud (Authorized only for own data)
export async function uploadToCloud(): Promise<{ lastSyncTime: string; petCount: number }> {
  const session = getStoredSession();
  if (!session.user || !session.authToken) {
    throw new Error('Musisz być zalogowany, aby zsynchronizować dane.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  const payload = bundleAllPetData();
  const petCount = payload.pets.length;

  try {
    const res = await safeApiCall('/api/cloud-sync/upload', {
      email: session.user.email,
      token: session.authToken,
      payload,
      petCount,
    });

    const now = res?.lastSyncTime || new Date().toISOString();
    saveSession({
      lastSyncStatus: 'success',
      lastSyncTime: now,
    });

    return { lastSyncTime: now, petCount };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw new Error(err.message || 'Nie udało się zapisać kopii w chmurze.');
  }
}

// Manual immediate synchronization trigger
export async function manualSyncNow(): Promise<{ lastSyncTime: string; petCount: number }> {
  return uploadToCloud();
}

// 6. Download pet data from Cloud (Authorized only for own data)
export async function downloadFromCloud(): Promise<{ petCount: number; lastSyncTime: string }> {
  const session = getStoredSession();
  if (!session.user || !session.authToken) {
    throw new Error('Zaloguj się, aby wczytać dane.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const data = await safeApiCall('/api/cloud-sync/download', {
      email: session.user.email,
      token: session.authToken,
    });

    if (data?.payload && Array.isArray(data.payload.pets)) {
      const { petCount } = restoreAllPetData(data.payload);
      const syncTime = data.lastSyncTime || new Date().toISOString();
      saveSession({
        lastSyncStatus: 'success',
        lastSyncTime: syncTime,
      });
      return { petCount, lastSyncTime: syncTime };
    }

    saveSession({ lastSyncStatus: 'success' });
    return { petCount: 0, lastSyncTime: new Date().toISOString() };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw new Error(err.message || 'Nie udało się pobrać danych z chmury.');
  }
}

// 7. Quick PIN generation for pairing another device
export async function generateQuickPairCode(): Promise<{ code: string; expiresAt: number }> {
  const session = getStoredSession();
  if (!session.user || !session.authToken) {
    throw new Error('Zaloguj się, aby wygenerować kod parowania.');
  }

  // Upload current data first to be 100% up to date
  await uploadToCloud();

  const data = await safeApiCall('/api/cloud-sync/generate-code', {
    email: session.user.email,
    token: session.authToken,
  });

  if (data?.code) {
    return { code: data.code, expiresAt: data.expiresAt };
  }

  throw new Error('Nie udało się wygenerować kodu parowania.');
}

// 8. Restore using 6-digit PIN on any phone
export async function pairWithQuickCode(code: string): Promise<{ petCount: number; user: CloudUser }> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) {
    throw new Error('Podaj pełny 6-cyfrowy kod.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  const data = await safeApiCall('/api/cloud-sync/pair-code', { code: clean });

  if (data?.payload) {
    storage.clearAllData();
    const { petCount } = restoreAllPetData(data.payload);
    const user: CloudUser = {
      email: data.user?.email,
      name: data.user?.name || data.user?.email.split('@')[0],
      avatar: data.user?.avatar,
      provider: 'email',
    };
    saveSession({
      user,
      authToken: data.token,
      lastSyncTime: data.lastSyncTime || new Date().toISOString(),
      lastSyncStatus: 'success',
    });
    return { petCount, user };
  }

  throw new Error('Nieprawidłowy kod PIN lub kod wygasł.');
}

// 9. Export manual JSON backup file
export function exportBackupFile() {
  const data = bundleAllPetData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PetCare_Kopia_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 10. Auto-Sync Check (Run once every 24h in the background)
export async function checkDailyAutoSync(): Promise<boolean> {
  const session = getStoredSession();
  if (!session.user || !session.authToken || !session.autoSync) return false;

  const lastSync = session.lastSyncTime ? new Date(session.lastSyncTime).getTime() : 0;
  const now = Date.now();
  const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

  if (hoursSinceSync >= AUTO_SYNC_INTERVAL_HOURS) {
    try {
      await uploadToCloud();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
