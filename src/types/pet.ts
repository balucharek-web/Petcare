export type Species = 'dog' | 'cat' | 'rabbit' | 'ferret' | 'bird' | 'other';

export type Gender = 'male' | 'female';

export interface PetWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  weightKg: number;
  chipNumber: string;
  tattooNumber?: string;
  passportNumber?: string;
  color: string;
  isNeutered: boolean;
  photoUrl: string;
  allergies?: string;
  bloodType?: string;
  specialNotes?: string;
  vetClinicName?: string;
  vetDoctorName?: string;
  vetPhone?: string;
  emergencyClinicPhone?: string;
  bookletScans?: { id: string; url: string; title: string; date: string }[]; // skany fizycznej książeczki zdrowia
  weightHistory: PetWeightEntry[];
  createdAt: string;
}

export type VaccineStatus = 'valid' | 'expiring_soon' | 'expired';

export type VaccineCategory = 'rabies' | 'core' | 'deworming' | 'antiparasitic' | 'non_core' | 'other';

export interface Vaccination {
  id: string;
  petId: string;
  name: string; // np. Wścieklizna (Rabisin), Odrobaczenie (Milprazon), NexGard
  category: VaccineCategory;
  dateAdministered: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  batchNumber?: string; // nr serii
  vetClinic?: string;
  vetDoctor?: string;
  notes?: string;
  attachmentUrls?: string[]; // scans/photos of passport entry or certificate
}

export type ExamResultStatus = 'normal' | 'attention' | 'abnormal';

export interface MedicalExam {
  id: string;
  petId: string;
  title: string; // np. Morfologia i biochemia krwi, USG jamy brzusznej, RTG stawów biodrowych
  category: 'blood' | 'urine' | 'ultrasound' | 'xray' | 'feces' | 'cardio' | 'cytology' | 'ophthalmic' | 'other';
  date: string; // YYYY-MM-DD
  clinic?: string;
  doctor?: string;
  status: ExamResultStatus;
  summary: string;
  keyParameters?: { name: string; value: string; unit?: string; refRange?: string; isFlagged?: boolean }[];
  scans: { id: string; url: string; title: string; date: string }[];
  nextRecommendedDate?: string;
}

export type DiseaseStatus = 'active' | 'chronic' | 'cured' | 'monitoring';

export interface MedicalCondition {
  id: string;
  petId: string;
  name: string; // np. Atopowe zapalenie skóry, Przewlekła niewydolność nerek
  diagnosisDate: string; // YYYY-MM-DD
  status: DiseaseStatus;
  symptoms: string;
  treatment: string;
  vetNotes?: string;
  resolvedDate?: string;
}

export interface VetVisit {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  reason: string; // Kontrola, Szczepienie, Badanie krwi, Zabieg chirurgiczny, Pilna wizyta
  clinic: string;
  doctor?: string;
  diagnosis?: string;
  treatmentGiven?: string;
  costPln?: number;
  nextAppointmentDate?: string;
  notes?: string;
}

export type MedicationForm = 'tablet' | 'capsule' | 'liquid' | 'drops' | 'ointment' | 'injection' | 'paste' | 'powder' | 'other';

export type TimeOfDayKey = 'morning' | 'noon' | 'evening' | 'night' | 'custom';

export interface DoseScheduleItem {
  id: string;
  label: string; // np. Rano, Południe, Wieczór, Noc, lub niestandardowa godzina
  time: string; // HH:mm format, np. 08:00
  amount: string; // np. "1/2 tabletki", "2.5 ml", "1 kropla"
}

export interface Medication {
  id: string;
  petId: string;
  name: string; // np. Cardisure, Onsior, Encorton, Bravecto
  activeIngredient?: string; // substancja czynna
  form: MedicationForm;
  dosage: string; // ogólna dawka np. "5 mg" lub "1 tab 2x dziennie"
  timesOfDay: DoseScheduleItem[]; // wybrane pory dnia i dokładne godziny
  instructions?: string; // np. "Podawać z mokrą karmą", "Na czczo 1h przed jedzeniem"
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD lub puste jeśli przewlekłe
  isChronic: boolean; // czy lek stały
  isActive: boolean; // czy aktualnie przyjmowany
  packageSize?: number; // ile tabletek w opakowaniu (np. 30, 60, 100)
  currentStock?: number; // aktualny stan zapasów (np. 24 tabletki)
  vetPrescribedBy?: string;
  notes?: string;
}

export interface DoseLogEntry {
  id: string;
  petId: string;
  medicationId: string;
  scheduledDate: string; // YYYY-MM-DD
  time: string; // HH:mm
  takenAt: string; // ISO string when clicked
  completed: boolean;
  notes?: string;
}

export type ExpenseCategory = 'vet' | 'meds' | 'food' | 'hygiene' | 'toys' | 'insurance' | 'training' | 'other';

export interface PetExpense {
  id: string;
  petId: string;
  title: string;
  amountPln: number;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  notes?: string;
  receiptUrl?: string;
}

export interface PetsitterPlan {
  petId: string;
  ownerPhone: string;
  secondaryContactPhone?: string;
  emergencyAddress?: string;
  meals: {
    id: string;
    time: string;
    description: string;
    amount: string;
  }[];
  walks: {
    id: string;
    time: string;
    durationMinutes: number;
    notes?: string;
  }[];
  medicationInstructions?: string;
  habitsAndFears: string;
  favoriteGamesAndTreats?: string;
  specialInstructions?: string;
}

export type ToxicitySeverity = 'safe' | 'caution' | 'toxic' | 'deadly';
export type ToxicityCategory = 'food' | 'plants' | 'human_meds' | 'chemicals';

export interface ToxicityItem {
  id: string;
  name: string;
  category: ToxicityCategory;
  dogSeverity: ToxicitySeverity;
  catSeverity: ToxicitySeverity;
  symptoms: string;
  dangerLevelDescription: string;
  firstAid: string;
  lethalThreshold?: string;
}

export type DashboardWidgetKey =
  | 'shortcuts'
  | 'nutritionCalculator'
  | 'weightTracker'
  | 'chipAndDocs'
  | 'toxicChecker'
  | 'expensesWidget'
  | 'petsitterCard'
  | 'aiScanner'
  | 'bookletScans'
  | 'healthAlerts'
  | 'vetContact';

export type DashboardConfig = Record<DashboardWidgetKey, boolean>;

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  shortcuts: true,
  nutritionCalculator: true,
  weightTracker: true,
  chipAndDocs: true,
  toxicChecker: true,
  expensesWidget: true,
  petsitterCard: true,
  aiScanner: true,
  bookletScans: true,
  healthAlerts: true,
  vetContact: true,
};
