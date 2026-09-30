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
  DashboardWidgetKey
} from '../types/pet';

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
};

const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore[key] || null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    delete memoryStore[key];
  }
}

const DEFAULT_INITIAL_PETS: Pet[] = [
  {
    id: 'pet-1',
    name: 'Baster',
    species: 'dog',
    breed: 'Mieszaniec',
    birthDate: '2021-05-10',
    gender: 'male',
    weightKg: 14.5,
    chipNumber: '616093900012345',
    color: 'Czarno-podpalany',
    photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
    isNeutered: true,
    weightHistory: [
      { id: 'w-1', date: '2025-01-10', weightKg: 14.2 },
      { id: 'w-2', date: '2025-06-15', weightKg: 14.5 }
    ],
    createdAt: '2025-01-01',
  }
];

const DEFAULT_INITIAL_VACCINATIONS: Vaccination[] = [
  {
    id: 'vac-1',
    petId: 'pet-1',
    name: 'Wścieklizna (Rabisin)',
    category: 'rabies',
    dateAdministered: '2026-06-15',
    validUntil: '2027-06-15',
    batchNumber: 'RB-2026-99A',
    vetClinic: 'Lecznica Weterynaryjna Cztery Łapy',
    vetDoctor: 'dr Anna Nowak',
  }
];

// Initialization check without auto-seeding mock data
function ensureCleanInitialization() {
  if (typeof window === 'undefined') return;
  try {
    // Only verify storage availability, do not seed mock pets
    safeSetItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
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
        return parsed;
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
        return {
          ...DEFAULT_DASHBOARD_CONFIG,
          ...parsed,
          order: mergedOrder,
        };
      } catch {}
    }
    return { ...DEFAULT_DASHBOARD_CONFIG, order: [...DEFAULT_WIDGET_ORDER] };
  },

  saveDashboardConfig(config: DashboardConfig): void {
    safeSetItem(STORAGE_KEYS.DASHBOARD_CONFIG, JSON.stringify(config));
  },

  // Full backup & restore
  exportAllData(): string {
    const rawPetsitter = safeGetItem(STORAGE_KEYS.PETSITTER);
    let petsitterData = {};
    if (rawPetsitter) {
      try { petsitterData = JSON.parse(rawPetsitter); } catch {}
    }
    const data = {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      pets: this.getPets(),
      vaccinations: this.getVaccinations(),
      exams: this.getExams(),
      conditions: this.getConditions(),
      visits: this.getVisits(),
      medications: this.getMedications(),
      doseLogs: this.getDoseLogs(),
      expenses: this.getExpenses(),
      petsitter: petsitterData,
      dashboardConfig: this.getDashboardConfig(),
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.pets)) this.savePets(parsed.pets);
      if (Array.isArray(parsed.vaccinations)) this.saveVaccinations(parsed.vaccinations);
      if (Array.isArray(parsed.exams)) this.saveExams(parsed.exams);
      if (Array.isArray(parsed.conditions)) this.saveConditions(parsed.conditions);
      if (Array.isArray(parsed.visits)) this.saveVisits(parsed.visits);
      if (Array.isArray(parsed.medications)) this.saveMedications(parsed.medications);
      if (Array.isArray(parsed.expenses)) this.saveExpenses(parsed.expenses);
      if (parsed.petsitter && typeof parsed.petsitter === 'object') {
        safeSetItem(STORAGE_KEYS.PETSITTER, JSON.stringify(parsed.petsitter));
      }
      if (parsed.dashboardConfig) this.saveDashboardConfig(parsed.dashboardConfig);
      if (Array.isArray(parsed.doseLogs)) safeSetItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(parsed.doseLogs));
      if (parsed.pets?.length > 0) {
        this.setActivePetId(parsed.pets[0].id);
      }
      return true;
    } catch {
      return false;
    }
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
    safeRemoveItem(STORAGE_KEYS.PETSITTER);
    safeRemoveItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    safeSetItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
  },

  seedSampleData(): void {
    this.savePets(DEFAULT_INITIAL_PETS);
    this.saveVaccinations(DEFAULT_INITIAL_VACCINATIONS);
    if (DEFAULT_INITIAL_PETS[0]) {
      this.setActivePetId(DEFAULT_INITIAL_PETS[0].id);
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
