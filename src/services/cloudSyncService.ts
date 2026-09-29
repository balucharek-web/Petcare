import { storage } from './storage';

const STORAGE_SESSION_KEY = 'petcare_google_cloud_session';
const AUTO_SYNC_INTERVAL_HOURS = 24;

export interface CloudUser {
  email: string;
  name: string;
  avatar?: string;
  provider: 'google';
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
    lastSyncTime: null,
    lastSyncStatus: 'idle',
    autoSync: true,
  };
}

export function saveSession(updates: Partial<CloudSession>): CloudSession {
  const current = getStoredSession();
  const next: CloudSession = { ...current, ...updates };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribeToCloudSync(listener: CloudSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Parse Google JWT ID token from Google Identity Services
export function parseGoogleJwt(token: string): { email: string; name: string; picture?: string; sub: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Błąd dekodowania tokena Google JWT:', err);
    return null;
  }
}

// 1-Click Google Sign-In (Zero passwords required)
export async function signInWithGoogle(
  email: string,
  displayName?: string,
  avatar?: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Nieprawidłowy adres konta Google.');
  }

  const name = displayName || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
  const user: CloudUser = {
    email: cleanEmail,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`,
    provider: 'google',
  };

  // Register / Authenticate on PetCare Cloud Sync API
  let authToken = '';
  try {
    const authRes = await fetch('/api/cloud-sync/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: user.name,
        avatar: user.avatar,
      }),
    });
    if (authRes.ok) {
      const authData = await authRes.json();
      authToken = authData.token || '';
      // If server already has saved pets and local is empty, restore them
      if (authData.hasData && storage.getPets().length === 0) {
        try {
          const downloadRes = await fetch('/api/cloud-sync/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, token: authToken }),
          });
          if (downloadRes.ok) {
            const downData = await downloadRes.json();
            if (downData.payload) {
              restoreAllPetData(downData.payload);
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Backend sync auth warning:', err);
  }

  saveSession({
    user,
    authToken,
    lastSyncStatus: 'syncing',
  });

  // Automatically trigger sync upload on login
  try {
    const res = await uploadToCloud();
    return { user, petCount: res.petCount };
  } catch (err) {
    saveSession({ lastSyncStatus: 'idle' });
    return { user, petCount: storage.getPets().length };
  }
}

// Sign out from Google
export function signOutGoogle(): void {
  saveSession({
    user: null,
    authToken: undefined,
    lastSyncStatus: 'idle',
  });
}

// Bundle local data into exportable structure
export function bundleAllPetData() {
  const allPets = storage.getPets();
  const allVaccinations = storage.getVaccinations();
  const allMedications = storage.getMedications();
  const allExams = storage.getExams();
  const allConditions = storage.getConditions();
  const allVisits = storage.getVisits();
  const activePetId = storage.getActivePetId();

  const expenses = localStorage.getItem('petcare_expenses') || '[]';
  const petsitterNotes = localStorage.getItem('petcare_petsitter_notes') || '{}';
  const customizer = localStorage.getItem('petcare_dashboard_config') || '{}';

  return {
    version: '2.4.0',
    exportDate: new Date().toISOString(),
    pets: allPets,
    vaccinations: allVaccinations,
    medications: allMedications,
    exams: allExams,
    conditions: allConditions,
    visits: allVisits,
    activePetId: activePetId,
    additional: {
      expenses: JSON.parse(expenses),
      petsitterNotes: JSON.parse(petsitterNotes),
      dashboardConfig: JSON.parse(customizer),
    },
  };
}

// Restore data into local storage
export function restoreAllPetData(payload: any): { petCount: number } {
  if (!payload || !Array.isArray(payload.pets)) {
    throw new Error('Pobrany plik kopii zapasowej jest nieprawidłowy.');
  }

  storage.savePets(payload.pets);

  if (Array.isArray(payload.vaccinations)) {
    storage.saveVaccinations(payload.vaccinations);
  }
  if (Array.isArray(payload.medications)) {
    storage.saveMedications(payload.medications);
  }
  if (Array.isArray(payload.exams)) {
    storage.saveExams(payload.exams);
  }
  if (Array.isArray(payload.conditions)) {
    storage.saveConditions(payload.conditions);
  }
  if (Array.isArray(payload.visits)) {
    storage.saveVisits(payload.visits);
  }
  if (payload.activePetId) {
    storage.setActivePetId(payload.activePetId);
  }

  if (payload.additional) {
    if (payload.additional.expenses) {
      localStorage.setItem('petcare_expenses', JSON.stringify(payload.additional.expenses));
    }
    if (payload.additional.petsitterNotes) {
      localStorage.setItem('petcare_petsitter_notes', JSON.stringify(payload.additional.petsitterNotes));
    }
    if (payload.additional.dashboardConfig) {
      localStorage.setItem('petcare_dashboard_config', JSON.stringify(payload.additional.dashboardConfig));
    }
  }

  return { petCount: payload.pets.length };
}

// Upload pet data to Cloud
export async function uploadToCloud(): Promise<{ lastSyncTime: string; petCount: number }> {
  const session = getStoredSession();
  if (!session.user) {
    throw new Error('Musisz być zalogowany kontem Google, aby zapisać kopię.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  const payload = bundleAllPetData();
  const petCount = payload.pets.length;
  const nowIso = new Date().toISOString();

  try {
    const res = await fetch('/api/cloud-sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        token: session.authToken,
        payload,
        petCount,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Błąd odpowiedzi serwera chmury.');
    }

    const data = await res.json();
    const syncTime = data.lastSyncTime || nowIso;

    saveSession({
      lastSyncTime: syncTime,
      lastSyncStatus: 'success',
    });

    return {
      lastSyncTime: syncTime,
      petCount,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw new Error(err.message || 'Nie udało się zapisać kopii w chmurze.');
  }
}

// Manual immediate synchronization trigger
export async function manualSyncNow(): Promise<{ lastSyncTime: string; petCount: number }> {
  return uploadToCloud();
}

// Download pet data from Cloud
export async function downloadFromCloud(): Promise<{ petCount: number; lastSyncTime: string }> {
  const session = getStoredSession();
  if (!session.user) {
    throw new Error('Zaloguj się kontem Google, aby wczytać dane.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const res = await fetch('/api/cloud-sync/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        token: session.authToken,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Nie znaleziono danych w chmurze dla tego konta.');
    }

    const data = await res.json();
    if (!data.payload) {
      throw new Error('Brak danych w pobranej kopii.');
    }

    const { petCount } = restoreAllPetData(data.payload);
    const syncTime = data.lastSyncTime || new Date().toISOString();

    saveSession({
      lastSyncTime: syncTime,
      lastSyncStatus: 'success',
    });

    return { petCount, lastSyncTime: syncTime };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw new Error(err.message || 'Nie udało się wczytać danych z chmury.');
  }
}

// Generate a 6-digit Quick Pair PIN
export async function generateQuickPairCode(): Promise<{ code: string; expiresAt: number }> {
  const session = getStoredSession();
  if (!session.user) {
    throw new Error('Zaloguj się kontem Google, aby wygenerować kod parowania.');
  }

  await uploadToCloud();

  try {
    const res = await fetch('/api/cloud-sync/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        token: session.authToken,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.code) {
        return { code: data.code, expiresAt: data.expiresAt };
      }
    }
  } catch {}

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 20 * 60 * 1000;
  return { code, expiresAt };
}

// Restore using 6-digit PIN on any phone
export async function pairWithQuickCode(code: string): Promise<{ petCount: number; user: CloudUser }> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) {
    throw new Error('Podaj pełny 6-cyfrowy kod.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const res = await fetch('/api/cloud-sync/pair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: clean }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.payload) {
        const { petCount } = restoreAllPetData(data.payload);
        const user: CloudUser = {
          email: data.user.email,
          name: data.user.name,
          avatar: data.user.avatar,
          provider: 'google',
        };
        saveSession({
          user,
          authToken: data.token,
          lastSyncTime: data.lastSyncTime || new Date().toISOString(),
          lastSyncStatus: 'success',
        });
        return { petCount, user };
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Nieprawidłowy kod parowania.');
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw err;
  }
}

// Background auto sync (24h)
export async function checkDailyAutoSync(): Promise<boolean> {
  const session = getStoredSession();
  if (!session.user || !session.autoSync) return false;

  const now = Date.now();
  if (session.lastSyncTime) {
    const lastSyncMs = new Date(session.lastSyncTime).getTime();
    const hours = (now - lastSyncMs) / (1000 * 60 * 60);
    if (hours < AUTO_SYNC_INTERVAL_HOURS) return false;
  }

  try {
    await uploadToCloud();
    return true;
  } catch {
    return false;
  }
}

// Download offline .json
export function exportBackupFile(): void {
  const payload = bundleAllPetData();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PetCare_Kopia_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
