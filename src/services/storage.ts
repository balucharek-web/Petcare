import { 
  Pet, 
  Vaccination, 
  MedicalExam, 
  MedicalCondition, 
  VetVisit, 
  Medication, 
  DoseLogEntry,
  PetExpense,
  PetsitterPlan,
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_WIDGET_ORDER,
  DashboardWidgetKey,
  ParasiteProtection,
  CalendarCustomEvent
} from '../types/pet';

import { idbGetAll, idbSet, idbDelete } from './indexedDbService';

const STORAGE_KEYS = {
  PETS: 'petcare_pets_v2',
  ACTIVE_PET_ID: 'petcare_active_pet_id_v2',
  VACCINATIONS: 'petcare_vaccinations_v2',
  EXAMS: 'petcare_exams_v2',
  CONDITIONS: 'petcare_conditions_v2',
  VISITS: 'petcare_visits_v2',
  MEDICATIONS: 'petcare_medications_v2',
  DOSE_LOGS: 'petcare_dose_logs_v2',
  EXPENSES: 'petcare_expenses_v2',
  PETSITTER: 'petcare_petsitter_v2',
  DASHBOARD_CONFIG: 'petcare_dashboard_config_v2',
  CLEAN_INITIALIZED: 'petcare_clean_initialized_v2',
  DISMISSED_ALERTS: 'petcare_dismissed_alerts_v2',
  PARASITES: 'petcare_parasites_v2',
  CUSTOM_CALENDAR_EVENTS: 'petcare_custom_calendar_events_v2',
  LAST_LOCAL_MODIFIED: 'petcare_last_local_modified_v2',
};

const memoryStore: Record<string, string> = {};

// Data keys live in IndexedDB (no ~5 MB quota). memoryStore is the synchronous
// cache hydrated by initStorage() before the app renders.
const IDB_KEYS = new Set<string>(
  Object.values(STORAGE_KEYS).filter((k) => k !== STORAGE_KEYS.LAST_LOCAL_MODIFIED)
);
let idbReady = false;

export async function initStorage(): Promise<void> {
  try {
    const persisted = await idbGetAll();
    for (const key of IDB_KEYS) {
      if (persisted[key] !== undefined) {
        memoryStore[key] = persisted[key];
        continue;
      }
      let legacy: string | null = null;
      try { legacy = localStorage.getItem(key); } catch {}
      if (legacy !== null) {
        await idbSet(key, legacy);
        memoryStore[key] = legacy;
      }
    }
    idbReady = true;
    for (const key of IDB_KEYS) {
      if (memoryStore[key] !== undefined) {
        try { localStorage.removeItem(key); } catch {}
      }
    }
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch (err) {
    idbReady = false;
    console.warn('[Storage] IndexedDB unavailable, falling back to localStorage', err);
  }
}

function persistToIdb(key: string, value: string | null): void {
  const op = value === null ? idbDelete(key) : idbSet(key, value);
  op.catch((err) => {
    console.warn(`[Storage] IndexedDB write failed for ${key}`, err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('petcare_storage_quota_warning'));
    }
  });
}

type StorageChangeListener = (key: string) => void;
const changeListeners: Set<StorageChangeListener> = new Set();

export function subscribeToStorageChanges(fn: StorageChangeListener): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

function notifyStorageChanged(key: string) {
  if (key.startsWith('petcare_')) {
    if (
      key !== STORAGE_KEYS.LAST_LOCAL_MODIFIED &&
      key !== STORAGE_KEYS.DISMISSED_ALERTS &&
      !key.includes('metadata') &&
      !key.includes('theme') &&
      !key.includes('token')
    ) {
      try {
        const now = new Date().toISOString();
        memoryStore[STORAGE_KEYS.LAST_LOCAL_MODIFIED] = now;
        localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_MODIFIED, now);
      } catch {}
    }
    changeListeners.forEach(fn => {
      try { fn(key); } catch {}
    });
  }
}

function safeGetItem(key: string): string | null {
  if (idbReady && IDB_KEYS.has(key)) {
    return memoryStore[key] ?? null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore[key] || null;
  }
}

function safeSetItem(key: string, value: string): void {
  // Always update memory store for instantaneous availability and zero-crash guarantee
  memoryStore[key] = value;

  if (idbReady && IDB_KEYS.has(key)) {
    persistToIdb(key, value);
    notifyStorageChanged(key);
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`[Storage Warning] Błąd zapisu klucza ${key}:`, err?.name || err);

    // Self-healing if LocalStorage quota is exceeded (QuotaExceededError, code 22 or 1014)
    const isQuotaError = 
      err?.name === 'QuotaExceededError' || 
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
      err?.code === 22 || 
      err?.code === 1014;

    if (isQuotaError) {
      try {
        // Step 1: Purge non-essential caches
        localStorage.removeItem(STORAGE_KEYS.DISMISSED_ALERTS);

        // Step 2: Trim older dose logs beyond 150 items to free space
        const rawLogs = localStorage.getItem(STORAGE_KEYS.DOSE_LOGS);
        if (rawLogs) {
          try {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs) && parsedLogs.length > 150) {
              const trimmed = parsedLogs.slice(-150);
              localStorage.setItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(trimmed));
            }
          } catch {}
        }

        // Step 3: Retry setting the critical item
        localStorage.setItem(key, value);
        console.log(`[Storage Self-Healing] Pomyślnie zwolniono miejsce i zapisano klucz ${key}`);
      } catch (retryErr) {
        console.warn('[Storage Quota] Nie udało się zapisać do localStorage po czyszczeniu. Dane zachowane w pamięci podręcznej.', retryErr);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('petcare_storage_quota_warning'));
        }
      }
    }
  }
  notifyStorageChanged(key);
}

function safeRemoveItem(key: string): void {
  if (idbReady && IDB_KEYS.has(key)) {
    delete memoryStore[key];
    persistToIdb(key, null);
    notifyStorageChanged(key);
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    delete memoryStore[key];
  }
  notifyStorageChanged(key);
}

const DEFAULT_INITIAL_PETS: Pet[] = [];
const DEFAULT_INITIAL_VACCINATIONS: Vaccination[] = [];
const DEFAULT_INITIAL_EXAMS: MedicalExam[] = [];
const DEFAULT_INITIAL_MEDS: Medication[] = [];

// Optional sample data loaded ONLY if user explicitly clicks "Wczytaj profil przykładowy"
const SAMPLE_DEMO_PETS: Pet[] = [
  {
    id: 'pet-1',
    name: 'Baster',
    species: 'dog',
    breed: 'Golden Retriever / Mieszaniec',
    birthDate: '2021-05-10',
    gender: 'male',
    weightKg: 14.5,
    chipNumber: '616093900012345',
    color: 'Złoto-podpalany',
    photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80',
    isNeutered: true,
    allergies: 'Kurczak / drób, Pszenica (zboża glutenowe)',
    specialNotes: 'Pies wrażliwy na karmę drobiową. Regularna kontrola enzymów wątrobowych i profilaktyka kleszczy.',
    vetClinicName: 'Klinika Weterynaryjna Cztery Łapy',
    vetDoctorName: 'lek. wet. Anna Nowak',
    vetPhone: '+48 601 234 567',
    emergencyClinicName: 'Klinika Całodobowa Wet-Dyżur 24h',
    emergencyClinicPhone: '+48 22 845 22 33',
    weightHistory: [
      { id: 'w-1', date: '2025-03-10', weightKg: 13.9 },
      { id: 'w-2', date: '2025-08-15', weightKg: 14.2 },
      { id: 'w-3', date: '2026-01-20', weightKg: 14.5 }
    ],
    createdAt: '2025-01-01',
  }
];

const SAMPLE_DEMO_VACCINATIONS: Vaccination[] = [
  {
    id: 'vac-1',
    petId: 'pet-1',
    name: 'Wścieklizna (Rabisin)',
    category: 'rabies',
    dateAdministered: '2026-06-15',
    validUntil: '2027-06-15',
    batchNumber: 'RB-2026-99A',
    vetClinic: 'Lecznica Weterynaryjna Cztery Łapy',
    vetDoctor: 'lek. wet. Anna Nowak',
  },
  {
    id: 'vac-2',
    petId: 'pet-1',
    name: 'Nobivac DHPPi (Nosówka, Parwowiroza, Adenowirus)',
    category: 'core',
    dateAdministered: '2026-04-10',
    validUntil: '2027-04-10',
    batchNumber: 'NB-4421X',
    vetClinic: 'Lecznica Weterynaryjna Cztery Łapy',
    vetDoctor: 'lek. wet. Anna Nowak',
  }
];

const SAMPLE_DEMO_EXAMS: MedicalExam[] = [
  {
    id: 'exam-1',
    petId: 'pet-1',
    title: 'Morfologia i Biochemia Krwi (Profil Wstępny)',
    category: 'blood',
    date: '2025-05-12',
    clinic: 'Lecznica Weterynaryjna Cztery Łapy',
    doctor: 'lek. wet. Anna Nowak',
    status: 'normal',
    summary: 'Wszystkie parametry w granicach normy fizjologicznej.',
    keyParameters: [
      { name: 'ALT (GPT)', value: '55', unit: 'U/L', refRange: '10 - 100', isFlagged: false },
      { name: 'AST (GOT)', value: '32', unit: 'U/L', refRange: '0 - 50', isFlagged: false },
      { name: 'Mocznik (BUN)', value: '38', unit: 'mg/dl', refRange: '20 - 45', isFlagged: false },
      { name: 'Kreatynina', value: '1.1', unit: 'mg/dl', refRange: '0.5 - 1.7', isFlagged: false },
      { name: 'Glukoza', value: '88', unit: 'mg/dl', refRange: '70 - 120', isFlagged: false },
    ],
    scans: []
  },
  {
    id: 'exam-2',
    petId: 'pet-1',
    title: 'Profil Wątrobowo-Nerkowy Rozszerzony',
    category: 'blood',
    date: '2025-10-18',
    clinic: 'Lecznica Weterynaryjna Cztery Łapy',
    doctor: 'lek. wet. Anna Nowak',
    status: 'attention',
    summary: 'Lekki przejściowy wzrost enzymów wątrobowych (ALT). Wdrożono suplementację.',
    keyParameters: [
      { name: 'ALT (GPT)', value: '78', unit: 'U/L', refRange: '10 - 100', isFlagged: false },
      { name: 'AST (GOT)', value: '44', unit: 'U/L', refRange: '0 - 50', isFlagged: false },
      { name: 'Mocznik (BUN)', value: '42', unit: 'mg/dl', refRange: '20 - 45', isFlagged: false },
      { name: 'Kreatynina', value: '1.3', unit: 'mg/dl', refRange: '0.5 - 1.7', isFlagged: false },
      { name: 'Glukoza', value: '92', unit: 'mg/dl', refRange: '70 - 120', isFlagged: false },
    ],
    scans: []
  },
  {
    id: 'exam-3',
    petId: 'pet-1',
    title: 'Kontrolne Badanie Krwi (Poprawa Parametrów)',
    category: 'blood',
    date: '2026-03-24',
    clinic: 'Lecznica Weterynaryjna Cztery Łapy',
    doctor: 'lek. wet. Anna Nowak',
    status: 'normal',
    summary: 'Spadek parametrów wątrobowych do optymalnego poziomu. Doskonała reakcja na suplement.',
    keyParameters: [
      { name: 'ALT (GPT)', value: '62', unit: 'U/L', refRange: '10 - 100', isFlagged: false },
      { name: 'AST (GOT)', value: '35', unit: 'U/L', refRange: '0 - 50', isFlagged: false },
      { name: 'Mocznik (BUN)', value: '34', unit: 'mg/dl', refRange: '20 - 45', isFlagged: false },
      { name: 'Kreatynina', value: '1.0', unit: 'mg/dl', refRange: '0.5 - 1.7', isFlagged: false },
      { name: 'Glukoza', value: '85', unit: 'mg/dl', refRange: '70 - 120', isFlagged: false },
    ],
    scans: []
  }
];

const SAMPLE_DEMO_MEDS: Medication[] = [
  {
    id: 'med-1',
    petId: 'pet-1',
    name: 'Hepatiale Forte (Wsparcie wątroby)',
    form: 'tablet',
    dosage: '1 tabletka rano',
    instructions: 'Podawać z posiłkiem lub przysmakiem',
    timesOfDay: [
      { id: 't-1', label: 'Rano', time: '08:00', amount: '1 tabletka' }
    ],
    packageSize: 30,
    currentStock: 22,
    startDate: '2026-03-25',
    isChronic: true,
    isActive: true,
    notes: 'Zalecenie po badaniu enzymów wątrobowych.'
  }
];

// Clean initialization: starts completely clean without test pets on fresh launch
function ensureCleanInitialization() {
  if (typeof window === 'undefined') return;
  try {
    const existing = safeGetItem(STORAGE_KEYS.PETS);
    if (!existing) {
      safeSetItem(STORAGE_KEYS.PETS, JSON.stringify([]));
      safeSetItem(STORAGE_KEYS.ACTIVE_PET_ID, '');
      safeSetItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify([]));
      safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify([]));
      safeSetItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify([]));
    }
  } catch (e) {
    console.warn('Storage initialization note:', e);
  }
}

ensureCleanInitialization();

export const storage = {
  // Pets
  getPets(): Pet[] {
    const raw = safeGetItem(STORAGE_KEYS.PETS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((p: Pet) => {
          if ((!p.weightHistory || p.weightHistory.length === 0) && p.weightKg && p.weightKg > 0) {
            return {
              ...p,
              weightHistory: [
                {
                  id: `w-${p.id}-init`,
                  date: p.birthDate || p.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                  weightKg: p.weightKg,
                  notes: 'Waga profilu'
                }
              ]
            };
          }
          return p;
        });
      }
      return [];
    } catch {
      return [];
    }
  },

  savePets(pets: Pet[]): void {
    safeSetItem(STORAGE_KEYS.PETS, JSON.stringify(pets));
  },

  deletePet(id: string): void {
    const pets = this.getPets().filter(p => p.id !== id);
    this.savePets(pets);
    if (this.getActivePetId() === id) {
      this.setActivePetId(pets[0]?.id || '');
    }
    // Clean up all related pet data
    this.saveVaccinations(this.getVaccinations().filter(v => v.petId !== id));
    this.saveMedications(this.getMedications().filter(m => m.petId !== id));
    this.saveExams(this.getExams().filter(e => e.petId !== id));
    this.saveConditions(this.getConditions().filter(c => c.petId !== id));
    this.saveVisits(this.getVisits().filter(v => v.petId !== id));
    this.saveExpenses(this.getExpenses().filter(e => e.petId !== id));
    this.saveParasites(this.getParasites().filter(p => p.petId !== id));
    this.saveCustomCalendarEvents(this.getCustomCalendarEvents().filter(e => e.petId !== id));

    // Clean up dose logs
    const rawLogs = safeGetItem(STORAGE_KEYS.DOSE_LOGS);
    if (rawLogs) {
      try {
        const logs: DoseLogEntry[] = JSON.parse(rawLogs);
        safeSetItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(logs.filter(l => l.petId !== id)));
      } catch {}
    }

    // Clean up petsitter plan
    const rawPetsitter = safeGetItem(STORAGE_KEYS.PETSITTER);
    if (rawPetsitter) {
      try {
        const plans = JSON.parse(rawPetsitter);
        delete plans[id];
        safeSetItem(STORAGE_KEYS.PETSITTER, JSON.stringify(plans));
      } catch {}
    }
  },

  getActivePetId(): string {
    const active = safeGetItem(STORAGE_KEYS.ACTIVE_PET_ID);
    if (active) return active;
    const pets = this.getPets();
    const defaultId = pets[0]?.id || '';
    if (defaultId) {
      this.setActivePetId(defaultId);
    }
    return defaultId;
  },

  setActivePetId(id: string): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_PET_ID, id);
  },

  // Vaccinations
  getVaccinations(petId?: string): Vaccination[] {
    const raw = safeGetItem(STORAGE_KEYS.VACCINATIONS);
    let all: Vaccination[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(v => v.petId === petId) : all;
  },

  saveVaccinations(items: Vaccination[]): void {
    safeSetItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify(items));
  },

  deleteVaccination(id: string): void {
    const all = this.getVaccinations().filter(v => v.id !== id);
    this.saveVaccinations(all);
  },

  // Exams
  getExams(petId?: string): MedicalExam[] {
    const raw = safeGetItem(STORAGE_KEYS.EXAMS);
    let all: MedicalExam[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(e => e.petId === petId) : all;
  },

  saveExams(items: MedicalExam[]): void {
    safeSetItem(STORAGE_KEYS.EXAMS, JSON.stringify(items));
  },

  deleteExam(id: string): void {
    const all = this.getExams().filter(e => e.id !== id);
    this.saveExams(all);
  },

  // Conditions
  getConditions(petId?: string): MedicalCondition[] {
    const raw = safeGetItem(STORAGE_KEYS.CONDITIONS);
    let all: MedicalCondition[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(c => c.petId === petId) : all;
  },

  saveConditions(items: MedicalCondition[]): void {
    safeSetItem(STORAGE_KEYS.CONDITIONS, JSON.stringify(items));
  },

  deleteCondition(id: string): void {
    const all = this.getConditions().filter(c => c.id !== id);
    this.saveConditions(all);
  },

  // Visits
  getVisits(petId?: string): VetVisit[] {
    const raw = safeGetItem(STORAGE_KEYS.VISITS);
    let all: VetVisit[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(v => v.petId === petId) : all;
  },

  saveVisits(items: VetVisit[]): void {
    safeSetItem(STORAGE_KEYS.VISITS, JSON.stringify(items));
  },

  deleteVisit(id: string): void {
    const all = this.getVisits().filter(v => v.id !== id);
    this.saveVisits(all);
  },

  // Medications
  getMedications(petId?: string): Medication[] {
    const raw = safeGetItem(STORAGE_KEYS.MEDICATIONS);
    let all: Medication[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(m => m.petId === petId) : all;
  },

  saveMedications(items: Medication[]): void {
    safeSetItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(items));
  },

  deleteMedication(id: string): void {
    const all = this.getMedications().filter(m => m.id !== id);
    this.saveMedications(all);

    // Clean up dose logs for this medication
    const rawLogs = safeGetItem(STORAGE_KEYS.DOSE_LOGS);
    if (rawLogs) {
      try {
        const logs: DoseLogEntry[] = JSON.parse(rawLogs);
        const filtered = logs.filter(l => l.medicationId !== id);
        safeSetItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(filtered));
      } catch {
        // Safe fallback
      }
    }
  },

  // Dose logs (daily tracker)
  getDoseLogs(petId?: string, dateStr?: string): DoseLogEntry[] {
    const raw = safeGetItem(STORAGE_KEYS.DOSE_LOGS);
    let all: DoseLogEntry[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return all.filter(l => (!petId || l.petId === petId) && (!dateStr || l.scheduledDate === dateStr));
  },

  /** Marks a dose as taken (idempotent). Returns false if it was already logged. */
  markDoseTaken(petId: string, medicationId: string, time: string, scheduledDate: string): boolean {
    const already = this.getDoseLogs(petId, scheduledDate).some(
      l => l.medicationId === medicationId && l.time === time && l.completed
    );
    if (already) return false;
    return this.toggleDoseLog(petId, medicationId, time, scheduledDate);
  },

  toggleDoseLog(petId: string, medicationId: string, time: string, scheduledDate: string): boolean {
    const raw = safeGetItem(STORAGE_KEYS.DOSE_LOGS);
    let all: DoseLogEntry[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(
      l => l.petId === petId && l.medicationId === medicationId && l.time === time && l.scheduledDate === scheduledDate
    );

    let isCompleted = false;
    if (index >= 0) {
      // Toggle off / remove
      all.splice(index, 1);
      isCompleted = false;
    } else {
      all.push({
        id: `dose-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        petId,
        medicationId,
        scheduledDate,
        time,
        takenAt: new Date().toISOString(),
        completed: true,
      });
      isCompleted = true;
    }
    safeSetItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(all));
    return isCompleted;
  },

  // Expenses
  getExpenses(petId?: string): PetExpense[] {
    const raw = safeGetItem(STORAGE_KEYS.EXPENSES);
    let all: PetExpense[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return petId ? all.filter(e => e.petId === petId) : all;
  },

  saveExpenses(items: PetExpense[]): void {
    safeSetItem(STORAGE_KEYS.EXPENSES, JSON.stringify(items));
  },

  deleteExpense(id: string): void {
    const all = this.getExpenses().filter(e => e.id !== id);
    this.saveExpenses(all);
  },

  // Petsitter Plan
  getPetsitterPlan(petId: string): PetsitterPlan {
    const raw = safeGetItem(STORAGE_KEYS.PETSITTER);
    if (raw) {
      try {
        const all: Record<string, PetsitterPlan> = JSON.parse(raw);
        if (all[petId]) return all[petId];
      } catch {}
    }
    return {
      petId,
      ownerPhone: '',
      secondaryContactPhone: '',
      emergencyAddress: '',
      meals: [
        { id: 'm1', time: '08:00', description: 'Porcja karmy mokrej/suchej', amount: '100g' },
        { id: 'm2', time: '18:00', description: 'Porcja wieczorna', amount: '100g' }
      ],
      walks: [
        { id: 'w1', time: '07:30', durationMinutes: 25, notes: 'Szybki spacer fizjologiczny' },
        { id: 'w2', time: '15:30', durationMinutes: 45, notes: 'Długi spacer w parku' },
        { id: 'w3', time: '21:00', durationMinutes: 20, notes: 'Wieczorne wyjście' }
      ],
      habitsAndFears: 'Boi się odkurzacza i głośnych dźwięków. Lubi drapanie za uszami.',
      favoriteGamesAndTreats: 'Suszona wołowina, szarpak ze sznura.',
      specialInstructions: 'Nie otwierać drzwi balkonowych bez nadzoru.'
    };
  },

  savePetsitterPlan(plan: PetsitterPlan): void {
    const raw = safeGetItem(STORAGE_KEYS.PETSITTER);
    let all: Record<string, PetsitterPlan> = {};
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {}
    }
    all[plan.petId] = plan;
    safeSetItem(STORAGE_KEYS.PETSITTER, JSON.stringify(all));
  },

  // Dashboard customization
  getDashboardConfig(): DashboardConfig {
    const raw = safeGetItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const existingOrder: DashboardWidgetKey[] = Array.isArray(parsed?.order) ? parsed.order : [];
        const mergedOrder: DashboardWidgetKey[] = [
          ...existingOrder.filter((k: DashboardWidgetKey) => DEFAULT_WIDGET_ORDER.includes(k)),
          ...DEFAULT_WIDGET_ORDER.filter(k => !existingOrder.includes(k)),
        ];
        let finalOrder = mergedOrder;
        if (finalOrder.includes('weightTracker')) {
          finalOrder = finalOrder.filter(k => k !== 'weightTracker');
          const insertIdx = finalOrder.indexOf('shortcuts') !== -1 ? finalOrder.indexOf('shortcuts') + 1 : 2;
          finalOrder.splice(insertIdx, 0, 'weightTracker');
        }
        return {
          ...DEFAULT_DASHBOARD_CONFIG,
          ...parsed,
          weightTracker: parsed?.weightTracker !== undefined ? parsed.weightTracker : true,
          order: finalOrder,
        };
      } catch {}
    }
    return { ...DEFAULT_DASHBOARD_CONFIG, order: [...DEFAULT_WIDGET_ORDER] };
  },

  saveDashboardConfig(config: DashboardConfig): void {
    safeSetItem(STORAGE_KEYS.DASHBOARD_CONFIG, JSON.stringify(config));
  },

  // Parasite & Tick Protections
  getParasites(petId?: string): ParasiteProtection[] {
    const raw = safeGetItem(STORAGE_KEYS.PARASITES);
    if (!raw) return [];
    try {
      const items: ParasiteProtection[] = JSON.parse(raw);
      if (!Array.isArray(items)) return [];
      return petId ? items.filter(p => p.petId === petId) : items;
    } catch {
      return [];
    }
  },

  saveParasite(item: ParasiteProtection): void {
    const all = this.getParasites();
    const idx = all.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.unshift(item);
    }
    safeSetItem(STORAGE_KEYS.PARASITES, JSON.stringify(all));
  },

  saveParasites(items: ParasiteProtection[]): void {
    safeSetItem(STORAGE_KEYS.PARASITES, JSON.stringify(items));
  },

  deleteParasite(id: string): void {
    const all = this.getParasites().filter(p => p.id !== id);
    safeSetItem(STORAGE_KEYS.PARASITES, JSON.stringify(all));
  },

  // Custom In-App Calendar Events
  getCustomCalendarEvents(petId?: string): CalendarCustomEvent[] {
    const raw = safeGetItem(STORAGE_KEYS.CUSTOM_CALENDAR_EVENTS);
    if (!raw) return [];
    try {
      const items: CalendarCustomEvent[] = JSON.parse(raw);
      if (!Array.isArray(items)) return [];
      return petId ? items.filter(e => e.petId === petId) : items;
    } catch {
      return [];
    }
  },

  saveCustomCalendarEvent(event: CalendarCustomEvent): void {
    const all = this.getCustomCalendarEvents();
    const idx = all.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      all[idx] = event;
    } else {
      all.unshift(event);
    }
    safeSetItem(STORAGE_KEYS.CUSTOM_CALENDAR_EVENTS, JSON.stringify(all));
  },

  saveCustomCalendarEvents(events: CalendarCustomEvent[]): void {
    safeSetItem(STORAGE_KEYS.CUSTOM_CALENDAR_EVENTS, JSON.stringify(events));
  },

  deleteCustomCalendarEvent(id: string): void {
    const all = this.getCustomCalendarEvents().filter(e => e.id !== id);
    safeSetItem(STORAGE_KEYS.CUSTOM_CALENDAR_EVENTS, JSON.stringify(all));
  },

  // Full backup & restore
  exportAllData(): string {
    const rawPetsitter = safeGetItem(STORAGE_KEYS.PETSITTER);
    let petsitterData = {};
    if (rawPetsitter) {
      try { petsitterData = JSON.parse(rawPetsitter); } catch {}
    }
    const data = {
      version: '2.2',
      exportedAt: new Date().toISOString(),
      pets: this.getPets(),
      vaccinations: this.getVaccinations(),
      exams: this.getExams(),
      conditions: this.getConditions(),
      visits: this.getVisits(),
      medications: this.getMedications(),
      doseLogs: this.getDoseLogs(),
      expenses: this.getExpenses(),
      parasites: this.getParasites(),
      calendarEvents: this.getCustomCalendarEvents(),
      petsitter: petsitterData,
      dashboardConfig: this.getDashboardConfig(),
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonStr: string): boolean {
    try {
      let parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        if (parsed.payload && typeof parsed.payload === 'object') {
          parsed = { ...parsed, ...parsed.payload };
        } else if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
          parsed = { ...parsed, ...parsed.data };
        }
      }

      // If root is directly an array of pets
      if (Array.isArray(parsed)) {
        this.savePets(parsed);
        if (parsed.length > 0) this.setActivePetId(parsed[0].id);
        return true;
      }

      if (Array.isArray(parsed.pets)) this.savePets(parsed.pets);
      if (Array.isArray(parsed.vaccinations)) this.saveVaccinations(parsed.vaccinations);
      if (Array.isArray(parsed.exams)) this.saveExams(parsed.exams);
      if (Array.isArray(parsed.conditions)) this.saveConditions(parsed.conditions);
      if (Array.isArray(parsed.visits)) this.saveVisits(parsed.visits);
      if (Array.isArray(parsed.medications)) this.saveMedications(parsed.medications);
      if (Array.isArray(parsed.expenses)) this.saveExpenses(parsed.expenses);
      if (Array.isArray(parsed.parasites)) this.saveParasites(parsed.parasites);
      if (Array.isArray(parsed.calendarEvents)) this.saveCustomCalendarEvents(parsed.calendarEvents);
      if (parsed.petsitter && typeof parsed.petsitter === 'object') {
        safeSetItem(STORAGE_KEYS.PETSITTER, JSON.stringify(parsed.petsitter));
      }
      if (parsed.dashboardConfig) this.saveDashboardConfig(parsed.dashboardConfig);
      if (Array.isArray(parsed.doseLogs)) safeSetItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(parsed.doseLogs));
      if (parsed.pets?.length > 0) {
        this.setActivePetId(parsed.pets[0].id);
      }
      this.setLastLocalModified(parsed.exportedAt || new Date().toISOString());
      return true;
    } catch {
      return false;
    }
  },

  getLastLocalModified(): string {
    return safeGetItem(STORAGE_KEYS.LAST_LOCAL_MODIFIED) || new Date().toISOString();
  },

  setLastLocalModified(iso?: string): void {
    const val = iso || new Date().toISOString();
    safeSetItem(STORAGE_KEYS.LAST_LOCAL_MODIFIED, val);
  },

  clearAllData(): void {
    safeRemoveItem(STORAGE_KEYS.PETS);
    safeRemoveItem(STORAGE_KEYS.ACTIVE_PET_ID);
    safeRemoveItem(STORAGE_KEYS.VACCINATIONS);
    safeRemoveItem(STORAGE_KEYS.EXAMS);
    safeRemoveItem(STORAGE_KEYS.CONDITIONS);
    safeRemoveItem(STORAGE_KEYS.VISITS);
    safeRemoveItem(STORAGE_KEYS.MEDICATIONS);
    safeRemoveItem(STORAGE_KEYS.DOSE_LOGS);
    safeRemoveItem(STORAGE_KEYS.EXPENSES);
    safeRemoveItem(STORAGE_KEYS.PARASITES);
    safeRemoveItem(STORAGE_KEYS.CUSTOM_CALENDAR_EVENTS);
    safeRemoveItem(STORAGE_KEYS.PETSITTER);
    safeRemoveItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    safeSetItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
  },

  seedSampleData(): void {
    this.savePets(SAMPLE_DEMO_PETS);
    this.saveVaccinations(SAMPLE_DEMO_VACCINATIONS);
    this.saveExams(SAMPLE_DEMO_EXAMS);
    this.saveMedications(SAMPLE_DEMO_MEDS);
    if (SAMPLE_DEMO_PETS[0]) {
      this.setActivePetId(SAMPLE_DEMO_PETS[0].id);
    }
  },

  // Dismissed Alerts Management
  getDismissedAlertIds(): string[] {
    const raw = safeGetItem(STORAGE_KEYS.DISMISSED_ALERTS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  dismissAlert(id: string): void {
    const current = this.getDismissedAlertIds();
    if (!current.includes(id)) {
      safeSetItem(STORAGE_KEYS.DISMISSED_ALERTS, JSON.stringify([...current, id]));
    }
  },

  dismissAlerts(ids: string[]): void {
    const current = new Set(this.getDismissedAlertIds());
    ids.forEach(id => current.add(id));
    safeSetItem(STORAGE_KEYS.DISMISSED_ALERTS, JSON.stringify(Array.from(current)));
  },

  clearDismissedAlerts(): void {
    safeRemoveItem(STORAGE_KEYS.DISMISSED_ALERTS);
  }
};
