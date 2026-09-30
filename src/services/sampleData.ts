import { 
  Pet, 
  Vaccination, 
  MedicalExam, 
  MedicalCondition, 
  VetVisit, 
  Medication, 
  DoseLogEntry 
} from '../types/pet';

export const SAMPLE_PET: Pet = {
  id: 'pet-bono-sample',
  name: 'Bono',
  species: 'dog',
  breed: 'Golden Retriever',
  gender: 'male',
  birthDate: '2021-06-15',
  weightKg: 29.5,
  chipNumber: '616093900123456',
  tattooNumber: 'A-142',
  passportNumber: 'PL 1234567',
  color: 'Złoty / Miodowy',
  isNeutered: true,
  photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
  allergies: 'Kurczak (świąd uszu), pyłki traw i roztocza',
  bloodType: 'DEA 1.1 negatywny',
  specialNotes: 'Bardzo łagodny i towarzyski. Boi się burzy i wystrzałów sylwestrowych.',
  vetClinicName: 'Przychodnia Weterynaryjna "Cztery Łapy"',
  vetDoctorName: 'Lek. wet. Anna Kowalska',
  vetPhone: '+48 12 345 67 89',
  emergencyClinicPhone: '+48 600 112 999 (Klinika Całodobowa 24/7)',
  weightHistory: [
    { id: 'w1', date: '2025-08-10', weightKg: 29.0, notes: 'Waga w normie' },
    { id: 'w2', date: '2025-11-15', weightKg: 29.8, notes: 'Kontrola przed zimą' },
    { id: 'w3', date: '2026-02-14', weightKg: 29.5, notes: 'Optymalna kondycja mięśniowa' }
  ],
  createdAt: '2025-01-10T10:00:00.000Z'
};

export const SAMPLE_MEDICATIONS: Medication[] = [
  {
    id: 'med-cardisure-1',
    petId: 'pet-bono-sample',
    name: 'Cardisure 5mg',
    activeIngredient: 'Pimobendan 5mg',
    form: 'tablet',
    dosage: '1 tabletka 2 razy dziennie',
    timesOfDay: [
      { id: 't1', label: 'Rano', time: '08:00', amount: '1 tabletka' },
      { id: 't2', label: 'Wieczór', time: '20:00', amount: '1 tabletka' }
    ],
    instructions: 'Podawać ściśle na czczo – ok. 30 minut przed posiłkiem (wsparcie pracy serca)',
    startDate: '2025-10-15',
    isChronic: true,
    isActive: true,
    packageSize: 50,
    currentStock: 42,
    vetPrescribedBy: 'dr Anna Kowalska',
    notes: 'Brak niepożądanych objawów, bardzo dobra tolerancja'
  },
  {
    id: 'med-apoquel-2',
    petId: 'pet-bono-sample',
    name: 'Apoquel 16mg',
    activeIngredient: 'Oklacytynib 16mg',
    form: 'tablet',
    dosage: '1/2 tabletki raz dziennie',
    timesOfDay: [
      { id: 't3', label: 'Rano', time: '09:00', amount: '1/2 tabletki' }
    ],
    instructions: 'Podawać rano przy zaostrzeniu świądu alergicznego',
    startDate: '2026-02-01',
    isChronic: false,
    isActive: true,
    packageSize: 20,
    currentStock: 18,
    vetPrescribedBy: 'dr Anna Kowalska'
  }
];

export const SAMPLE_VACCINATIONS: Vaccination[] = [
  {
    id: 'vac-rabies-1',
    petId: 'pet-bono-sample',
    name: 'Wścieklizna (Rabisin)',
    category: 'rabies',
    dateAdministered: '2025-05-15',
    validUntil: '2026-05-15',
    batchNumber: 'L49281-A',
    vetClinic: 'Cztery Łapy',
    vetDoctor: 'dr Anna Kowalska',
    notes: 'Ważne coroczne szczepienie ustawowe'
  },
  {
    id: 'vac-dhppi-2',
    petId: 'pet-bono-sample',
    name: 'Choroby zakaźne (Nobivac DHPPi + L4)',
    category: 'core',
    dateAdministered: '2024-11-20',
    validUntil: '2026-11-20',
    batchNumber: 'N91204',
    vetClinic: 'Cztery Łapy',
    vetDoctor: 'dr Anna Kowalska',
    notes: 'Nosówka, parwowiroza, zakaźne zapalenie wątroby, parainfluenza, leptospiroza'
  },
  {
    id: 'vac-kleszcze-3',
    petId: 'pet-bono-sample',
    name: 'Ochrona kleszcze i pchły (Bravecto 1000mg)',
    category: 'non_core',
    dateAdministered: '2026-01-15',
    validUntil: '2026-04-15',
    batchNumber: 'BR-8819',
    vetClinic: 'Cztery Łapy',
    notes: 'Tabletka do żucia działająca przez pełne 12 tygodni'
  }
];

export const SAMPLE_EXAMS: MedicalExam[] = [
  {
    id: 'exam-blood-1',
    petId: 'pet-bono-sample',
    title: 'Profil biochemiczny i morfologia krwi',
    category: 'blood',
    date: '2026-02-14',
    clinic: 'Laboratorium Weterynaryjne VetLab',
    doctor: 'dr Anna Kowalska',
    status: 'normal',
    summary: 'Profil nerkowy (kreatynina, mocznik) i wątrobowy (ALT, AST, ALP) bez odchyleń od normy.',
    keyParameters: [
      { name: 'RBC (krwinki czerwone)', value: '7.2', unit: 'M/µL', refRange: '5.5 - 8.5', isFlagged: false },
      { name: 'WBC (leukocyty)', value: '8.9', unit: 'K/µL', refRange: '6.0 - 17.0', isFlagged: false },
      { name: 'Kreatynina', value: '1.05', unit: 'mg/dL', refRange: '0.5 - 1.7', isFlagged: false },
      { name: 'ALT', value: '41', unit: 'U/L', refRange: '10 - 100', isFlagged: false }
    ],
    scans: [],
    nextRecommendedDate: '2026-08-14'
  },
  {
    id: 'exam-cardio-2',
    petId: 'pet-bono-sample',
    title: 'Echo serca i EKG',
    category: 'cardio',
    date: '2025-10-12',
    clinic: 'Klinika Kardiologiczna VetCardio',
    doctor: 'dr hab. Piotr Wiśniewski',
    status: 'attention',
    summary: 'Łagodna niedomykalność zastawki mitralnej (stadium B1). Wprowadzono prewencyjnie Cardisure.',
    keyParameters: [
      { name: 'LA/Ao (stosunek lewego przedsionka do aorty)', value: '1.45', unit: '', refRange: '< 1.6', isFlagged: false },
      { name: 'Frakcja skracania FS', value: '38%', unit: '%', refRange: '30 - 45%', isFlagged: false }
    ],
    scans: [],
    nextRecommendedDate: '2026-04-12'
  }
];

export const SAMPLE_CONDITIONS: MedicalCondition[] = [
  {
    id: 'cond-1',
    petId: 'pet-bono-sample',
    name: 'Atopowe zapalenie skóry (AZS)',
    diagnosisDate: '2024-03-20',
    status: 'chronic',
    symptoms: 'Świąd łapek, zaczerwienienie małżowin usznych w sezonie pylenia traw',
    treatment: 'Apoquel 16mg doraźnie, szampon hipoalergiczny z chlorheksydyną',
    vetNotes: 'Ścisła dieta monobiałkowa (ryba/jagnięcina), unikać drobiu'
  },
  {
    id: 'cond-2',
    petId: 'pet-bono-sample',
    name: 'Niedomykalność zastawki mitralnej (MMVD B1)',
    diagnosisDate: '2025-10-12',
    status: 'monitoring',
    symptoms: 'Cichy szmer sercowy stopnia 1-2/6, brak duszności czy kaszlu',
    treatment: 'Cardisure 5mg 2x dziennie',
    vetNotes: 'Kontrola echa serca co 6 miesięcy'
  }
];

export const SAMPLE_VISITS: VetVisit[] = [
  {
    id: 'vis-1',
    petId: 'pet-bono-sample',
    date: '2026-02-14',
    time: '11:30',
    reason: 'Kontrola kardiologiczna i pobranie krwi do badań okresowych',
    clinic: 'Przychodnia Weterynaryjna Cztery Łapy',
    doctor: 'Lek. wet. Anna Kowalska',
    diagnosis: 'Stan ogólny pacjenta bardzo dobry. Szmer sercowy bez zmian, osłuchowo czysto.',
    treatmentGiven: 'Pobrano krew żylną, wypisano receptę na Cardisure 5mg (2 opakowania).',
    costPln: 190,
    nextAppointmentDate: '2026-05-15',
    notes: 'Kolejna wizyta połączona ze szczepieniem przeciw wściekliźnie'
  },
  {
    id: 'vis-2',
    petId: 'pet-bono-sample',
    date: '2025-10-12',
    time: '16:00',
    reason: 'Badanie kardiologiczne (echo serca + EKG)',
    clinic: 'Klinika Kardiologiczna VetCardio',
    doctor: 'dr hab. Piotr Wiśniewski',
    diagnosis: 'Początkowe stadium niedomykalności zastawki mitralnej MMVD B1',
    treatmentGiven: 'Wdrożenie leczenia inotropowo-rozszerzającego naczynia (Cardisure)',
    costPln: 320,
    nextAppointmentDate: '2026-04-12',
    notes: 'Zalecenie kontroli echa serca na wiosnę'
  }
];

export const SAMPLE_DOSE_LOGS: DoseLogEntry[] = [
  {
    id: 'dose-log-sample-1',
    petId: 'pet-bono-sample',
    medicationId: 'med-cardisure-1',
    scheduledDate: new Date().toISOString().slice(0, 10),
    time: '08:00',
    takenAt: new Date().toISOString(),
    completed: true
  }
];

export function getSampleDataPackage() {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    pets: [SAMPLE_PET],
    vaccinations: SAMPLE_VACCINATIONS,
    exams: SAMPLE_EXAMS,
    conditions: SAMPLE_CONDITIONS,
    visits: SAMPLE_VISITS,
    medications: SAMPLE_MEDICATIONS,
    doseLogs: SAMPLE_DOSE_LOGS
  };
}

export function getSampleDataJson(): string {
  return JSON.stringify(getSampleDataPackage(), null, 2);
}
