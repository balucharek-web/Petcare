import { storage } from './storage';

// Base URL for Cloud Sync: In Capacitor Android, connects directly to Cloud Run backend
export const CLOUD_API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running inside Android Capacitor APK or mobile webview
    if (host === 'localhost' || host === '127.0.0.1' || !host) {
      return 'https://ais-pre-jncmusdflv7zr74uqtfecz-503832482938.europe-west2.run.app';
    }
  }
  return '';
})();

const STORAGE_SESSION_KEY = 'petcare_cloud_session';
const AUTO_SYNC_INTERVAL_HOURS = 24;

export interface CloudUser {
  email: string;
  name: string;
  avatar?: string;
}

export interface CloudSession {
  user: CloudUser | null;
  token: string | null;
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
    token: null,
    lastSyncTime: null,
    lastSyncStatus: 'idle',
    autoSync: true,
  };
}

export function saveSession(updates: Partial<CloudSession>): CloudSession {
  const current = getStoredSession();
  const next: CloudSession = { ...current, ...updates };
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(next));
  listeners.forEach(fn => fn(next));
  return next;
}

export function subscribeToCloudSync(listener: CloudSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Log in or register with email (supports Google emails like @gmail.com)
export async function loginWithCloud(
  email: string, 
  password?: string, 
  name?: string
): Promise<{ user: CloudUser; petCount: number; lastSyncTime: string | null }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    throw new Error('Podaj poprawny adres e-mail (np. Twoje konto Google).');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const res = await fetch(`${CLOUD_API_BASE}/api/cloud-sync/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmed,
        password: password || 'petcare_pass',
        name: name || trimmed.split('@')[0],
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Logowanie do chmury nie powiodło się.');
    }

    const session = saveSession({
      user: data.user,
      token: data.token,
      lastSyncTime: data.lastSyncTime || null,
      lastSyncStatus: 'success',
    });

    return {
      user: data.user,
      petCount: data.petCount || 0,
      lastSyncTime: data.lastSyncTime || null,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw err;
  }
}

// Sign out from cloud
export function signOutCloud(): void {
  saveSession({
    user: null,
    token: null,
    lastSyncStatus: 'idle',
  });
}

// Collect all data from localStorage
export function bundleAllPetData() {
  const allPets = storage.getPets();
  const allVaccinations = storage.getVaccinations();
  const allMedications = storage.getMedications();
  const allExams = storage.getExams();
  const allConditions = storage.getConditions();
  const allVisits = storage.getVisits();
  const activePetId = storage.getActivePetId();

  // Supplementary data in localStorage
  const expenses = localStorage.getItem('petcare_expenses') || '[]';
  const petsitterNotes = localStorage.getItem('petcare_petsitter_notes') || '{}';
  const customizer = localStorage.getItem('petcare_dashboard_config') || '{}';

  return {
    version: '2.2.0',
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

// Restore all data into localStorage and storage service
export function restoreAllPetData(payload: any): { petCount: number } {
  if (!payload || !Array.isArray(payload.pets)) {
    throw new Error('Otrzymany plik danych z chmury jest nieprawidłowy.');
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

  // Restore additional items
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

// Upload local data to PetCare Cloud
export async function uploadToCloud(): Promise<{ lastSyncTime: string; petCount: number }> {
  const session = getStoredSession();
  if (!session.user || !session.token) {
    throw new Error('Musisz być zalogowany, aby zsynchronizować dane z chmurą.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  const payload = bundleAllPetData();
  const petCount = payload.pets.length;

  try {
    const res = await fetch(`${CLOUD_API_BASE}/api/cloud-sync/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        token: session.token,
        payload,
        petCount,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Nie udało się przesłać danych do chmury.');
    }

    saveSession({
      lastSyncTime: data.lastSyncTime,
      lastSyncStatus: 'success',
    });

    return {
      lastSyncTime: data.lastSyncTime,
      petCount: data.petCount,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw err;
  }
}

// Download data from PetCare Cloud
export async function downloadFromCloud(): Promise<{ petCount: number; lastSyncTime: string }> {
  const session = getStoredSession();
  if (!session.user || !session.token) {
    throw new Error('Musisz być zalogowany, aby pobrać dane z chmury.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const res = await fetch(`${CLOUD_API_BASE}/api/cloud-sync/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        token: session.token,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Nie udało się pobrać danych z chmury.');
    }

    const { petCount } = restoreAllPetData(data.payload);

    saveSession({
      lastSyncTime: data.lastSyncTime,
      lastSyncStatus: 'success',
    });

    return {
      petCount,
      lastSyncTime: data.lastSyncTime,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw err;
  }
}

// Generate 6-digit Quick Pair PIN
export async function generateQuickPairCode(): Promise<{ code: string; expiresAt: number }> {
  const session = getStoredSession();
  if (!session.user || !session.token) {
    throw new Error('Zaloguj się, aby wygenerować kod parowania.');
  }

  const res = await fetch(`${CLOUD_API_BASE}/api/cloud-sync/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: session.user.email,
      token: session.token,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Nie udało się wygenerować kodu.');
  }

  return { code: data.code, expiresAt: data.expiresAt };
}

// Pair device using 6-digit PIN
export async function pairWithQuickCode(code: string): Promise<{ petCount: number; user: CloudUser }> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) {
    throw new Error('Wprowadź 6-cyfrowy kod parowania.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  try {
    const res = await fetch(`${CLOUD_API_BASE}/api/cloud-sync/pair-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: clean }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Błąd łączenia z użyciem kodu.');
    }

    let petCount = 0;
    if (data.payload) {
      const result = restoreAllPetData(data.payload);
      petCount = result.petCount;
    }

    saveSession({
      user: data.user,
      token: data.token,
      lastSyncTime: data.lastSyncTime,
      lastSyncStatus: 'success',
    });

    return {
      petCount,
      user: data.user,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw err;
  }
}

// Background auto-sync check (called every 24 hours)
export async function checkDailyAutoSync(): Promise<boolean> {
  const session = getStoredSession();
  if (!session.user || !session.token || !session.autoSync) {
    return false;
  }

  const now = Date.now();
  if (session.lastSyncTime) {
    const lastSyncMs = new Date(session.lastSyncTime).getTime();
    const hoursSinceLastSync = (now - lastSyncMs) / (1000 * 60 * 60);
    if (hoursSinceLastSync < AUTO_SYNC_INTERVAL_HOURS) {
      return false; // Still fresh
    }
  }

  try {
    console.log('[PetCare Cloud] Wykonywanie cichej synchronizacji w tle (24h)...');
    await uploadToCloud();
    return true;
  } catch (err) {
    console.warn('[PetCare Cloud] Błąd cichej synchronizacji w tle:', err);
    return false;
  }
}

// Offline backup download (JSON file)
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
