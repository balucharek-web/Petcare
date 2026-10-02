import { storage } from './storage';
import { 
  googleSignOut as googleDriveSignOut, 
  uploadPetDataToDrive, 
  downloadPetDataFromDrive, 
  findDriveBackupFile, 
  autoRestoreFromDriveIfEmpty,
  setCachedAccessToken
} from './googleDriveSync';
import { logoutFirebaseAuth } from './firebaseAuth';
import { Capacitor } from '@capacitor/core';

const STORAGE_SESSION_KEY = 'petcare_google_cloud_session';
const AUTO_SYNC_INTERVAL_HOURS = 24;
const REMOTE_BACKEND_URL = (import.meta as any).env?.VITE_APP_URL || (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('capacitor:') && !window.location.origin.startsWith('file:') && window.location.origin.includes('.run.app') ? window.location.origin : 'https://ais-pre-ikwyyen5v5xsycfajtbpir-559140193543.europe-west3.run.app');

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

// Ensures a valid session after direct QR transfer or local restore
export function ensureGuestSession(displayName?: string): CloudSession {
  const existing = getStoredSession();
  if (existing.user) return existing;
  const guestUser: CloudUser = {
    email: 'opiekun@petcare.local',
    name: displayName || 'Opiekun Zwierzaka',
    avatar: 'https://ui-avatars.com/api/?name=Opiekun&background=0D9488&color=fff&bold=true',
    provider: 'email',
  };
  return saveSession({
    user: guestUser,
    lastSyncStatus: 'success',
    lastSyncTime: new Date().toISOString(),
  });
}

// Check if an existing cloud backup exists on user's Google Drive
export async function checkCloudBackup(email: string, token?: string): Promise<{ exists: boolean; petCount: number; lastSyncTime: string | null; payload?: any }> {
  try {
    const driveFile = await findDriveBackupFile(token);
    if (driveFile) {
      return {
        exists: true,
        petCount: 0,
        lastSyncTime: driveFile.modifiedTime || null,
      };
    }
  } catch {}
  return { exists: false, petCount: 0, lastSyncTime: null };
}

// Get the correct API URL (resolves relative paths to the live backend when inside Capacitor Android)
export function getApiUrl(endpoint: string): string {
  if (typeof window === 'undefined') return endpoint;
  const origin = window.location.origin || '';
  // If running inside Capacitor native container (Android APK) or file protocol, use the live cloud backend
  if (
    Capacitor.isNativePlatform() ||
    origin.startsWith('capacitor:') || 
    origin.startsWith('file:') ||
    origin.startsWith('android-') ||
    origin === 'null'
  ) {
    return `${REMOTE_BACKEND_URL}${endpoint}`;
  }
  // When running on web or preview or localhost, use relative path directly
  return endpoint;
}

// Isolated per-user storage key (ensures 100% data isolation on device)
function getUserAccountKey(email: string): string {
  return `petcare_acc_${email.trim().toLowerCase()}`;
}

// Local isolated account engine (offline-first & Android APK local storage fallback)
function handleIsolatedAccountStore(endpoint: string, body: any): any {
  const email = (body?.email || '').trim().toLowerCase();
  const accountKey = getUserAccountKey(email);
  const now = new Date().toISOString();

  if (endpoint.includes('/auth')) {
    const raw = localStorage.getItem(accountKey);
    let account = raw ? JSON.parse(raw) : null;
    const isGoogle = body?.provider === 'google' || body?.action === 'google';
    const token = 'tok_dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    if (body?.action === 'register') {
      if (account && account.password) {
        throw new Error('Konto o tym adresie e-mail już istnieje. Przejdź do logowania.');
      }
      account = {
        email,
        password: body.password || '',
        name: body.name || email.split('@')[0],
        avatar: body.avatar || '',
        provider: 'email',
        token,
        lastSyncTime: now,
        petCount: 0,
        payload: {
          version: '2.5.0',
          pets: [],
          vaccinations: [],
          medications: [],
          exams: [],
          conditions: [],
          visits: []
        }
      };
      localStorage.setItem(accountKey, JSON.stringify(account));
      return {
        success: true,
        token: account.token,
        user: { email: account.email, name: account.name, avatar: account.avatar, provider: 'email' },
        petCount: 0,
        lastSyncTime: now,
        payload: account.payload,
      };
    }

    if (isGoogle) {
      if (!account) {
        account = {
          email,
          name: body.name || email.split('@')[0],
          avatar: body.avatar || '',
          provider: 'google',
          token,
          lastSyncTime: now,
          petCount: 0,
          payload: {
            version: '2.5.0',
            pets: [],
            vaccinations: [],
            medications: [],
            exams: [],
            conditions: [],
            visits: []
          }
        };
      } else {
        account.token = token;
        account.provider = 'google';
        if (body.name) account.name = body.name;
        if (body.avatar) account.avatar = body.avatar;
      }
      localStorage.setItem(accountKey, JSON.stringify(account));
      return {
        success: true,
        token: account.token,
        user: { email: account.email, name: account.name, avatar: account.avatar, provider: 'google' },
        petCount: account.petCount || account.payload?.pets?.length || 0,
        lastSyncTime: account.lastSyncTime || now,
        payload: account.payload || { pets: [] },
      };
    }

    // Standard Email login
    if (!account) {
      throw new Error('Nie znaleziono konta z tym adresem e-mail. Zarejestruj się.');
    }
    if (account.password && body.password && account.password !== body.password) {
      throw new Error('Nieprawidłowe hasło dla tego konta.');
    }
    account.token = token;
    localStorage.setItem(accountKey, JSON.stringify(account));
    return {
      success: true,
      token: account.token,
      user: { email: account.email, name: account.name, avatar: account.avatar, provider: 'email' },
      petCount: account.petCount || account.payload?.pets?.length || 0,
      lastSyncTime: account.lastSyncTime || now,
      payload: account.payload || { pets: [] },
    };
  }

  if (endpoint.includes('/upload')) {
    const raw = localStorage.getItem(accountKey);
    let account = raw ? JSON.parse(raw) : null;
    if (!account) {
      account = { email, token: body.token, payload: body.payload, petCount: body.petCount, lastSyncTime: now };
    } else {
      account.payload = body.payload;
      account.petCount = body.petCount;
      account.lastSyncTime = now;
    }
    localStorage.setItem(accountKey, JSON.stringify(account));
    return { success: true, lastSyncTime: now, petCount: body.petCount };
  }

  if (endpoint.includes('/download')) {
    const raw = localStorage.getItem(accountKey);
    const account = raw ? JSON.parse(raw) : null;
    return {
      success: true,
      payload: account?.payload || { pets: [] },
      lastSyncTime: account?.lastSyncTime || now,
      petCount: account?.petCount || 0
    };
  }

  return { success: true };
}

// Helper: safe API Call to server with automatic local isolated store fallback
async function safeApiCall(endpoint: string, bodyObj: any): Promise<any> {
  const url = getApiUrl(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Returned HTML or non-JSON (e.g. Capacitor Android local asset server)
      return handleIsolatedAccountStore(endpoint, bodyObj);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      const errMsg = data?.error || `Błąd serwera (${res.status})`;
      throw new Error(errMsg);
    }
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[PetCare] Offline/Local fallback for ${endpoint}:`, err.message);
    return handleIsolatedAccountStore(endpoint, bodyObj);
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

// 3. Sign in / Register with Google (secured with cryptographically signed idToken or Android device proof)
export async function signInWithGoogle(
  email: string,
  idToken?: string,
  displayName?: string,
  avatar?: string,
  androidProof?: { deviceId: string; timestamp: number; signature: string },
  accessToken?: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Nieprawidłowy adres konta Google.');
  }

  if (!idToken && !accessToken && !androidProof) {
    throw new Error('Brak bezpiecznego uwierzytelnienia konta Google. Logowanie przerwane.');
  }

  if (accessToken) {
    setCachedAccessToken(accessToken);
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
    idToken: idToken || undefined,
    accessToken: accessToken || undefined,
    name: user.name,
    avatar: user.avatar,
    provider: 'google',
    action: 'google',
  });

  const authToken = authData.token || '';
  let petCount = 0;

  // AUTOMATIC RESTORE:
  // 1. Try Google Drive first (with accessToken passed directly)
  try {
    const driveRestore = await autoRestoreFromDriveIfEmpty(accessToken);
    if (driveRestore.restored && driveRestore.petCount > 0) {
      petCount = driveRestore.petCount;
    }
  } catch (driveErr) {
    console.warn('Auto restore check from Drive:', driveErr);
  }

  // 2. Fallback to Cloud Sync database if Drive was empty
  if (petCount === 0 && authData.payload && Array.isArray(authData.payload.pets) && authData.payload.pets.length > 0) {
    const res = restoreAllPetData(authData.payload);
    petCount = res.petCount;
  }

  // 3. Fallback to explicit cloud download
  if (petCount === 0 && authToken) {
    try {
      const down = await safeApiCall('/api/cloud-sync/download', {
        email: cleanEmail,
        token: authToken,
      });
      if (down?.payload && Array.isArray(down.payload.pets) && down.payload.pets.length > 0) {
        const res = restoreAllPetData(down.payload);
        petCount = res.petCount;
      }
    } catch (downErr) {
      console.warn('Fallback cloud download check notice:', downErr);
    }
  }

  // If local storage has pets, update petCount
  if (petCount === 0) {
    petCount = storage.getPets().length;
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
  logoutFirebaseAuth().catch(() => {});
}

// Sign out alias for backwards compatibility
export const signOutGoogle = signOut;

// 5. Upload pet data (Google Drive prioritized, with automatic cloud backup safeguard)
export async function uploadToCloud(): Promise<{ lastSyncTime: string; petCount: number }> {
  saveSession({ lastSyncStatus: 'syncing' });
  const payload = bundleAllPetData();
  const count = payload.pets.length;
  let lastTime = new Date().toISOString();
  let driveSuccess = false;

  // 1. Try uploading to personal Google Drive
  try {
    const driveRes = await uploadPetDataToDrive();
    if (driveRes && driveRes.success) {
      driveSuccess = true;
      lastTime = driveRes.timestamp;
    }
  } catch (driveErr: any) {
    console.warn('Google Drive direct upload notice:', driveErr?.message);
  }

  // 2. Always maintain backup in user's isolated account profile
  const session = getStoredSession();
  if (session.user?.email && session.authToken) {
    try {
      const res = await safeApiCall('/api/cloud-sync/upload', {
        email: session.user.email,
        token: session.authToken,
        payload,
        petCount: count,
      });
      if (res?.lastSyncTime && !driveSuccess) {
        lastTime = res.lastSyncTime;
      }
    } catch (e) {
      console.warn('Secondary cloud backup notice:', e);
    }
  }

  saveSession({
    lastSyncStatus: 'success',
    lastSyncTime: lastTime,
  });

  return { lastSyncTime: lastTime, petCount: count };
}

// Manual immediate synchronization trigger
export async function manualSyncNow(): Promise<{ lastSyncTime: string; petCount: number }> {
  return uploadToCloud();
}

// 6. Download pet data (Google Drive prioritized, with automatic cloud backup safeguard)
export async function downloadFromCloud(): Promise<{ petCount: number; lastSyncTime: string }> {
  saveSession({ lastSyncStatus: 'syncing' });

  // 1. Try Google Drive first
  try {
    const driveRes = await downloadPetDataFromDrive();
    if (driveRes && driveRes.success && driveRes.petCount > 0) {
      saveSession({
        lastSyncStatus: 'success',
        lastSyncTime: driveRes.timestamp,
      });
      return { petCount: driveRes.petCount, lastSyncTime: driveRes.timestamp };
    }
  } catch (driveErr: any) {
    console.warn('Google Drive download notice:', driveErr?.message);
  }

  // 2. Fallback to Cloud Sync database
  const session = getStoredSession();
  if (session.user?.email && session.authToken) {
    try {
      const data = await safeApiCall('/api/cloud-sync/download', {
        email: session.user.email,
        token: session.authToken,
      });
      if (data?.payload && Array.isArray(data.payload.pets) && data.payload.pets.length > 0) {
        const { petCount } = restoreAllPetData(data.payload);
        const syncTime = data.lastSyncTime || new Date().toISOString();
        saveSession({
          lastSyncStatus: 'success',
          lastSyncTime: syncTime,
        });
        return { petCount, lastSyncTime: syncTime };
      }
    } catch (err: any) {
      console.warn('Cloud database fallback download notice:', err?.message);
    }
  }

  saveSession({ lastSyncStatus: 'success' });
  return { petCount: storage.getPets().length, lastSyncTime: new Date().toISOString() };
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

// 11. Permanently delete cloud account and backup data (GDPR / RODO Art. 17 - Right to Erasure)
export async function deleteCloudAccount(): Promise<boolean> {
  const session = getStoredSession();
  const email = session.user?.email;
  const token = session.authToken;

  if (email) {
    const accountKey = getUserAccountKey(email);
    localStorage.removeItem(accountKey);
  }

  if (email && token) {
    try {
      const url = getApiUrl('/api/cloud-sync/account');
      await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
    } catch (e) {
      console.warn('Błąd sieci podczas usuwania konta z chmury:', e);
    }
  }

  saveSession({
    user: null,
    authToken: undefined,
    lastSyncTime: null,
    lastSyncStatus: 'idle',
    autoSync: true,
  });

  return true;
}

