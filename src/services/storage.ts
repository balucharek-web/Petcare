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
  DEFAULT_DASHBOARD_CONFIG
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
};

// Automatic one-time cleanup of old sample data from previous v1 versions
function ensureCleanInitialization() {
  if (typeof window === 'undefined') return;
  const isClean = localStorage.getItem(STORAGE_KEYS.CLEAN_INITIALIZED);
  if (!isClean) {
    // Purge old mock v1 keys if any
    localStorage.removeItem('petcare_pets_v1');
    localStorage.removeItem('petcare_active_pet_id_v1');
    localStorage.removeItem('petcare_vaccinations_v1');
    localStorage.removeItem('petcare_exams_v1');
    localStorage.removeItem('petcare_conditions_v1');
    localStorage.removeItem('petcare_visits_v1');
    localStorage.removeItem('petcare_medications_v1');
    localStorage.removeItem('petcare_dose_logs_v1');
    
    // Clear v2 as well so everything starts completely clean
    localStorage.removeItem(STORAGE_KEYS.PETS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
    localStorage.removeItem(STORAGE_KEYS.VACCINATIONS);
    localStorage.removeItem(STORAGE_KEYS.EXAMS);
    localStorage.removeItem(STORAGE_KEYS.CONDITIONS);
    localStorage.removeItem(STORAGE_KEYS.VISITS);
    localStorage.removeItem(STORAGE_KEYS.MEDICATIONS);
    localStorage.removeItem(STORAGE_KEYS.DOSE_LOGS);

    localStorage.setItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
  }
}

ensureCleanInitialization();

export const storage = {
  // Pets
  getPets(): Pet[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PETS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  savePets(pets: Pet[]): void {
    localStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));
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
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_PET_ID);
    if (active) return active;
    const pets = this.getPets();
    const defaultId = pets[0]?.id || '';
    if (defaultId) {
      this.setActivePetId(defaultId);
    }
    return defaultId;
  },

  setActivePetId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PET_ID, id);
  },

  // Vaccinations
  getVaccinations(petId?: string): Vaccination[] {
    const raw = localStorage.getItem(STORAGE_KEYS.VACCINATIONS);
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
    localStorage.setItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify(items));
  },

  deleteVaccination(id: string): void {
    const all = this.getVaccinations().filter(v => v.id !== id);
    this.saveVaccinations(all);
  },

  // Exams
  getExams(petId?: string): MedicalExam[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
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
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(items));
  },

  deleteExam(id: string): void {
    const all = this.getExams().filter(e => e.id !== id);
    this.saveExams(all);
  },

  // Conditions
  getConditions(petId?: string): MedicalCondition[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CONDITIONS);
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
    localStorage.setItem(STORAGE_KEYS.CONDITIONS, JSON.stringify(items));
  },

  deleteCondition(id: string): void {
    const all = this.getConditions().filter(c => c.id !== id);
    this.saveConditions(all);
  },

  // Visits
  getVisits(petId?: string): VetVisit[] {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
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
    localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(items));
  },

  deleteVisit(id: string): void {
    const all = this.getVisits().filter(v => v.id !== id);
    this.saveVisits(all);
  },

  // Medications
  getMedications(petId?: string): Medication[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
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
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(items));
  },

  deleteMedication(id: string): void {
    const all = this.getMedications().filter(m => m.id !== id);
    this.saveMedications(all);

    // Clean up dose logs for this medication
    const rawLogs = localStorage.getItem(STORAGE_KEYS.DOSE_LOGS);
    if (rawLogs) {
      try {
        const logs: DoseLogEntry[] = JSON.parse(rawLogs);
        const filtered = logs.filter(l => l.medicationId !== id);
        localStorage.setItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(filtered));
      } catch {
        // Safe fallback
      }
    }
  },

  // Dose logs (daily tracker)
  getDoseLogs(petId?: string, dateStr?: string): DoseLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DOSE_LOGS);
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
    const raw = localStorage.getItem(STORAGE_KEYS.DOSE_LOGS);
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
    localStorage.setItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(all));
    return isCompleted;
  },

  // Expenses
  getExpenses(petId?: string): PetExpense[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
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
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(items));
  },

  deleteExpense(id: string): void {
    const all = this.getExpenses().filter(e => e.id !== id);
    this.saveExpenses(all);
  },

  // Petsitter Plan
  getPetsitterPlan(petId: string): PetsitterPlan {
    const raw = localStorage.getItem(STORAGE_KEYS.PETSITTER);
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
    const raw = localStorage.getItem(STORAGE_KEYS.PETSITTER);
    let all: Record<string, PetsitterPlan> = {};
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {}
    }
    all[plan.petId] = plan;
    localStorage.setItem(STORAGE_KEYS.PETSITTER, JSON.stringify(all));
  },

  // Dashboard customization
  getDashboardConfig(): DashboardConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    if (raw) {
      try {
        return { ...DEFAULT_DASHBOARD_CONFIG, ...JSON.parse(raw) };
      } catch {}
    }
    return { ...DEFAULT_DASHBOARD_CONFIG };
  },

  saveDashboardConfig(config: DashboardConfig): void {
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_CONFIG, JSON.stringify(config));
  },

  // Full backup & restore
  exportAllData(): string {
    const rawPetsitter = localStorage.getItem(STORAGE_KEYS.PETSITTER);
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
        localStorage.setItem(STORAGE_KEYS.PETSITTER, JSON.stringify(parsed.petsitter));
      }
      if (parsed.dashboardConfig) this.saveDashboardConfig(parsed.dashboardConfig);
      if (Array.isArray(parsed.doseLogs)) localStorage.setItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(parsed.doseLogs));
      if (parsed.pets?.length > 0) {
        this.setActivePetId(parsed.pets[0].id);
      }
      return true;
    } catch {
      return false;
    }
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PETS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
    localStorage.removeItem(STORAGE_KEYS.VACCINATIONS);
    localStorage.removeItem(STORAGE_KEYS.EXAMS);
    localStorage.removeItem(STORAGE_KEYS.CONDITIONS);
    localStorage.removeItem(STORAGE_KEYS.VISITS);
    localStorage.removeItem(STORAGE_KEYS.MEDICATIONS);
    localStorage.removeItem(STORAGE_KEYS.DOSE_LOGS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.PETSITTER);
    localStorage.removeItem(STORAGE_KEYS.DASHBOARD_CONFIG);
    localStorage.setItem(STORAGE_KEYS.CLEAN_INITIALIZED, 'true');
  }
};
