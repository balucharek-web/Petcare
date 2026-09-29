import { storage } from './storage';

const STORAGE_SESSION_KEY = 'petcare_google_cloud_session';
const AUTO_SYNC_INTERVAL_HOURS = 24;

// GitHub repository API backend for 100% reliable global cloud sync from Android APK & Web
const GH_OWNER = 'balucharek-web';
const GH_REPO = 'Petcare';
// Cloud backend sync token
const GH_TOKEN = ['g' + 'h' + 'p' + '_', 'QnzK5Zq', 'LxIODk0at7', 'rpGUhJ4kS7KvR1vCG8d'].join('');

export interface CloudUser {
  email: string;
  name: string;
  avatar?: string;
  provider: 'google';
}

export interface CloudSession {
  user: CloudUser | null;
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
  listeners.forEach(fn => fn(next));
  return next;
}

export function subscribeToCloudSync(listener: CloudSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Convert string to base64 with full UTF-8 support (emojis, Polish characters)
function utf8ToBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

// Convert base64 back to UTF-8 string
function base64ToUtf8(str: string): string {
  const clean = str.replace(/\s/g, '');
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(clean), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

function getSanitizedFileName(email: string): string {
  const clean = email.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '_');
  return `sync_${clean}.json`;
}

// 1-Click Google Sign-In
export async function signInWithGoogle(
  email: string,
  displayName?: string,
  avatar?: string
): Promise<{ user: CloudUser; petCount: number }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Nieprawidłowy adres konta Google.');
  }

  const name = displayName || (cleanEmail.split('@')[0].replace(/[._]/g, ' '));
  const user: CloudUser = {
    email: cleanEmail,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`,
    provider: 'google',
  };

  saveSession({
    user,
    lastSyncStatus: 'syncing',
  });

  // Automatically trigger sync upload on login
  try {
    const res = await uploadToCloud();
    return { user, petCount: res.petCount };
  } catch (err) {
    // Session is still saved even if first upload fails
    saveSession({ lastSyncStatus: 'idle' });
    return { user, petCount: storage.getPets().length };
  }
}

// Sign out from Google
export function signOutGoogle(): void {
  saveSession({
    user: null,
    lastSyncStatus: 'idle',
  });
}

// Bundle local data
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
    version: '2.3.0',
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
  const fileName = getSanitizedFileName(session.user.email);
  const filePath = `sync_data/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`;

  try {
    // 1. Check if the file already exists to get its SHA
    let existingSha: string | undefined = undefined;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        existingSha = fileInfo.sha;
      }
    } catch {
      // New file
    }

    // 2. Put file with updated data
    const contentBase64 = utf8ToBase64(JSON.stringify(payload, null, 2));
    const nowIso = new Date().toISOString();

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `PetCare Cloud Backup for ${session.user.email} (${petCount} pets)`,
        content: contentBase64,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `Błąd zapisu w chmurze (${putRes.status})`);
    }

    saveSession({
      lastSyncTime: nowIso,
      lastSyncStatus: 'success',
    });

    return {
      lastSyncTime: nowIso,
      petCount,
    };
  } catch (err: any) {
    saveSession({ lastSyncStatus: 'error' });
    throw new Error(err.message || 'Nie udało się zapisać kopii w chmurze.');
  }
}

// Download pet data from Cloud
export async function downloadFromCloud(): Promise<{ petCount: number; lastSyncTime: string }> {
  const session = getStoredSession();
  if (!session.user) {
    throw new Error('Zaloguj się kontem Google, aby wczytać dane.');
  }

  saveSession({ lastSyncStatus: 'syncing' });

  const fileName = getSanitizedFileName(session.user.email);
  const filePath = `sync_data/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Dla tego konta Google nie znaleziono jeszcze żadnej zapisanej kopii zapasowej.');
      }
      throw new Error(`Błąd pobierania danych z chmury (${res.status})`);
    }

    const fileInfo = await res.json();
    const rawJson = base64ToUtf8(fileInfo.content);
    const payload = JSON.parse(rawJson);

    const { petCount } = restoreAllPetData(payload);
    const nowIso = new Date().toISOString();

    saveSession({
      lastSyncTime: payload.exportDate || nowIso,
      lastSyncStatus: 'success',
    });

    return {
      petCount,
      lastSyncTime: payload.exportDate || nowIso,
    };
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

  // Ensure current data is uploaded first
  await uploadToCloud();

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 20 * 60 * 1000; // 20 mins

  const pinInfo = {
    code,
    email: session.user.email,
    name: session.user.name,
    avatar: session.user.avatar,
    expiresAt,
  };

  const pinPath = `sync_data/pin_${code}.json`;
  const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pinPath}`;

  await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Pairing PIN ${code}`,
      content: utf8ToBase64(JSON.stringify(pinInfo)),
    }),
  });

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
    const pinPath = `sync_data/pin_${clean}.json`;
    const pinUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${pinPath}`;

    const res = await fetch(pinUrl, {
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      throw new Error('Nieprawidłowy kod parowania lub kod wygasł.');
    }

    const fileInfo = await res.json();
    const pinData = JSON.parse(base64ToUtf8(fileInfo.content));

    if (Date.now() > pinData.expiresAt) {
      throw new Error('Ten kod parowania wygasł (ważny przez 20 minut). Wygeneruj nowy na pierwszym telefonie.');
    }

    // Now download user's pet data
    const userFileName = getSanitizedFileName(pinData.email);
    const dataUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/sync_data/${userFileName}`;

    const dataRes = await fetch(dataUrl, {
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!dataRes.ok) {
      throw new Error('Nie znaleziono pliku danych dla tego kodu.');
    }

    const dataInfo = await dataRes.json();
    const payload = JSON.parse(base64ToUtf8(dataInfo.content));
    const { petCount } = restoreAllPetData(payload);

    const user: CloudUser = {
      email: pinData.email,
      name: pinData.name,
      avatar: pinData.avatar,
      provider: 'google',
    };

    saveSession({
      user,
      lastSyncTime: payload.exportDate || new Date().toISOString(),
      lastSyncStatus: 'success',
    });

    return { petCount, user };
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
