/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  WifiOff, 
  AlertCircle,
  Plus,
  Cloud
} from 'lucide-react';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition, VetVisit, DashboardConfig } from './types/pet';
import { storage } from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { BottomNav, NavTab } from './components/BottomNav';
import { PetProfileView } from './components/PetProfileView';
import { MedicationsView } from './components/MedicationsView';
import { VaccinationsView } from './components/VaccinationsView';
import { ExamsAndTestsView } from './components/ExamsAndTestsView';
import { DiseasesAndVisitsView } from './components/DiseasesAndVisitsView';
import { CalendarHubView } from './components/CalendarHubView';
import { SOSModal } from './components/SOSModal';
import { HealthPassportModal } from './components/HealthPassportModal';
import { NewPetModal } from './components/NewPetModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { AlertsBanner } from './components/AlertsBanner';
import { getUpcomingAlerts } from './services/notifications';
import { usePWAInstall } from './hooks/usePWAInstall';

// Google Drive Sync
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { initAuth, checkDailyAutoSync } from './services/googleDriveSync';

// New Feature Modals
import { MedicalReportModal } from './components/MedicalReportModal';
import { ToxicityCheckerModal } from './components/ToxicityCheckerModal';
import { AIScannerModal } from './components/AIScannerModal';
import { NutritionCalculatorModal } from './components/NutritionCalculatorModal';
import { ExpensesModal } from './components/ExpensesModal';
import { PetsitterModal } from './components/PetsitterModal';
import { DashboardCustomizerModal } from './components/DashboardCustomizerModal';
import { ToolsHubModal } from './components/ToolsHubModal';

export default function App() {
  const { isInstalled } = usePWAInstall();
  const [pets, setPets] = useState<Pet[]>(() => storage.getPets());
  const [activePetId, setActivePetId] = useState<string>(() => storage.getActivePetId());
  const [currentTab, setCurrentTab] = useState<NavTab>('profile');

  // Dashboard configuration (customization of visible widgets on home screen)
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(() => storage.getDashboardConfig());

  // Modals state
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isNewPetOpen, setIsNewPetOpen] = useState(false);

  // New modules state
  const [isMedicalReportOpen, setIsMedicalReportOpen] = useState(false);
  const [isToxicityOpen, setIsToxicityOpen] = useState(false);
  const [isAIScannerOpen, setIsAIScannerOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isPetsitterOpen, setIsPetsitterOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isToolsHubOpen, setIsToolsHubOpen] = useState(false);
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);

  // Preview Mode: Android phone frame vs Full screen
  const [deviceFrameMode, setDeviceFrameMode] = useState<'mobile' | 'full'>('mobile');

  // Network status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Google Auth and daily background synchronization
  useEffect(() => {
    // 1. Initialize auth listener
    initAuth(
      () => {
        // Trigger auto-sync check if 24 hours have passed
        checkDailyAutoSync().catch(() => {});
      },
      () => {}
    );

    // 2. Perform background auto-sync check on app startup
    checkDailyAutoSync().catch(() => {});

    // 3. Periodic check every 1 hour and on app visibility change
    const interval = setInterval(() => {
      checkDailyAutoSync().catch(() => {});
    }, 60 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDailyAutoSync().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const activePet = pets.find(p => p.id === activePetId) || pets[0] || null;

  // Active pet's data
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [visits, setVisits] = useState<VetVisit[]>([]);

  // Load active pet data whenever activePet changes
  const reloadData = () => {
    const currentPets = storage.getPets();
    setPets(currentPets);
    const targetPetId = activePetId || currentPets[0]?.id;
    if (targetPetId) {
      setVaccinations(storage.getVaccinations(targetPetId));
      setMedications(storage.getMedications(targetPetId));
      setExams(storage.getExams(targetPetId));
      setConditions(storage.getConditions(targetPetId));
      setVisits(storage.getVisits(targetPetId));
    }
  };

  useEffect(() => {
    if (activePet?.id) {
      storage.setActivePetId(activePet.id);
      setVaccinations(storage.getVaccinations(activePet.id));
      setMedications(storage.getMedications(activePet.id));
      setExams(storage.getExams(activePet.id));
      setConditions(storage.getConditions(activePet.id));
      setVisits(storage.getVisits(activePet.id));
    }
  }, [activePetId]);

  // Mutations
  const handleSelectPet = (petId: string) => {
    setActivePetId(petId);
  };

  const handleUpdatePet = (updated: Pet) => {
    const newPets = pets.map(p => p.id === updated.id ? updated : p);
    setPets(newPets);
    storage.savePets(newPets);
  };

  const handleAddPet = (newPet: Pet) => {
    const newPets = [...pets, newPet];
    setPets(newPets);
    storage.savePets(newPets);
    setActivePetId(newPet.id);
  };

  const handleUpdateVaccinations = (items: Vaccination[]) => {
    const all = storage.getVaccinations();
    const other = all.filter(v => v.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveVaccinations(combined);
    setVaccinations(items);
  };

  const handleUpdateMedications = (items: Medication[]) => {
    const all = storage.getMedications();
    const other = all.filter(m => m.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveMedications(combined);
    setMedications(items);
  };

  const handleUpdateExams = (items: MedicalExam[]) => {
    const all = storage.getExams();
    const other = all.filter(e => e.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveExams(combined);
    setExams(items);
  };

  const handleUpdateConditions = (items: MedicalCondition[]) => {
    const all = storage.getConditions();
    const other = all.filter(c => c.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveConditions(combined);
    setConditions(items);
  };

  const handleUpdateVisits = (items: VetVisit[]) => {
    const all = storage.getVisits();
    const other = all.filter(v => v.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveVisits(combined);
    setVisits(items);
  };

  const handleSaveDashboardConfig = (newCfg: DashboardConfig) => {
    setDashboardConfig(newCfg);
    storage.saveDashboardConfig(newCfg);
  };

  // Badges & Alerts
  const activeMedsCount = medications.filter(m => m.isActive).length;
  const expiringVaccinesCount = vaccinations.filter(v => {
    const diff = (new Date(v.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).length;
  const upcomingAlerts = getUpcomingAlerts(activePet, vaccinations, medications, visits, exams);

  if (!activePet) {
    return (
      <div className="min-h-screen bg-slate-100 sm:bg-slate-900 text-slate-800 flex flex-col items-center justify-start sm:p-4 selection:bg-teal-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-100 min-h-screen sm:min-h-[860px] sm:max-h-[920px] sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-y-auto flex flex-col relative">
          {!isInstalled && <PWAInstallBanner />}

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/30 text-5xl">
              🐾
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-3 py-1 rounded-full border border-teal-200">
                Aplikacja PetCare
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Dodaj swojego zwierzaka
              </h2>
              <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                Dodaj dane swojego pupila (imię, rasę, wagę, mikroczip), aby stworzyć jego osobistą książeczkę zdrowia, plan leków i monitor żywienia.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3 pt-2">
              <button
                onClick={() => setIsNewPetOpen(true)}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-teal-700/25 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Dodaj zwierzaka</span>
              </button>

              <button
                onClick={() => setIsGoogleSyncOpen(true)}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl font-bold text-xs shadow-xs active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>Pobierz zwierzaki z Dysku Google</span>
              </button>
            </div>
          </div>
        </div>

        {isNewPetOpen && (
          <NewPetModal
            isOpen={isNewPetOpen}
            onClose={() => setIsNewPetOpen(false)}
            onAddPet={handleAddPet}
          />
        )}

        {isGoogleSyncOpen && (
          <GoogleSyncModal
            isOpen={isGoogleSyncOpen}
            onClose={() => setIsGoogleSyncOpen(false)}
            onDataRestored={reloadData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 sm:bg-slate-900 text-slate-800 flex flex-col items-center justify-start sm:p-4 selection:bg-teal-500 selection:text-white">
      {/* Top Device View Mode Switcher on desktop */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-4xl py-2 px-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
            🐾 PetCare Android App
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-800/60 text-teal-200 border border-teal-600/40">
            Zgodna z PWA & Android
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setDeviceFrameMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              deviceFrameMode === 'mobile' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Widok Smartfona Android
          </button>
          <button
            onClick={() => setDeviceFrameMode('full')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
              deviceFrameMode === 'full' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Pełna szerokość
          </button>
        </div>
      </div>

      {/* Main Container / Mobile Frame */}
      <div
        className={`w-full bg-slate-100 flex flex-col relative transition-all duration-300 ${
          deviceFrameMode === 'mobile'
            ? 'max-w-md min-h-screen sm:min-h-[860px] sm:max-h-[920px] sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-y-auto sm:ring-1 sm:ring-slate-700/50'
            : 'max-w-4xl min-h-screen sm:rounded-3xl sm:shadow-2xl overflow-hidden'
        }`}
      >
        {/* Android Speaker Bezel Notch */}
        {deviceFrameMode === 'mobile' && (
          <div className="hidden sm:flex justify-center pt-2 pb-1 bg-slate-900 sticky top-0 z-50">
            <div className="w-20 h-3.5 bg-slate-800 rounded-full flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900 ring-1 ring-slate-700" />
              <span className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        )}

        {/* PWA Install Banner */}
        {!isInstalled && <PWAInstallBanner />}

        {/* Offline notification banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-center gap-2 font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            Tryb offline — wszystkie Twoje dane są zapisane lokalnie w telefonie.
          </div>
        )}

        {/* Top App Bar */}
        <HeaderNav
          pets={pets}
          activePet={activePet}
          onSelectPet={handleSelectPet}
          onOpenNewPetModal={() => setIsNewPetOpen(true)}
          onOpenSOSModal={() => setIsSOSOpen(true)}
          onOpenPassportModal={() => setIsPassportOpen(true)}
          onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
          onOpenToxicityChecker={() => setIsToxicityOpen(true)}
          onOpenAIScanner={() => setIsAIScannerOpen(true)}
          onOpenToolsHub={() => setIsToolsHubOpen(true)}
          onOpenGoogleSync={() => setIsGoogleSyncOpen(true)}
          onDataChanged={reloadData}
        />

        {/* Proactive Alerts Banner */}
        <AlertsBanner
          alerts={upcomingAlerts}
          onNavigateToTab={(tab) => setCurrentTab(tab)}
        />

        {/* Main Body */}
        <main className="flex-1 p-4 overflow-y-auto">
          {currentTab === 'profile' && (
            <PetProfileView
              pet={activePet}
              onUpdatePet={handleUpdatePet}
              onOpenNewPetModal={() => setIsNewPetOpen(true)}
              totalVaccinationsCount={vaccinations.length}
              activeMedicationsCount={activeMedsCount}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              dashboardConfig={dashboardConfig}
              onOpenDashboardCustomizer={() => setIsCustomizerOpen(true)}
              onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
              onOpenToxicityChecker={() => setIsToxicityOpen(true)}
              onOpenAIScanner={() => setIsAIScannerOpen(true)}
              onOpenNutritionCalculator={() => setIsNutritionOpen(true)}
              onOpenExpenses={() => setIsExpensesOpen(true)}
              onOpenPetsitter={() => setIsPetsitterOpen(true)}
            />
          )}

          {currentTab === 'medications' && (
            <MedicationsView
              pet={activePet}
              medications={medications}
              onUpdateMedications={handleUpdateMedications}
            />
          )}

          {currentTab === 'vaccinations' && (
            <VaccinationsView
              pet={activePet}
              vaccinations={vaccinations}
              onUpdateVaccinations={handleUpdateVaccinations}
            />
          )}

          {currentTab === 'exams' && (
            <ExamsAndTestsView
              pet={activePet}
              exams={exams}
              onUpdateExams={handleUpdateExams}
            />
          )}

          {currentTab === 'diseases' && (
            <DiseasesAndVisitsView
              pet={activePet}
              conditions={conditions}
              visits={visits}
              onUpdateConditions={handleUpdateConditions}
              onUpdateVisits={handleUpdateVisits}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarHubView
              pet={activePet}
              vaccinations={vaccinations}
              medications={medications}
              exams={exams}
              visits={visits}
            />
          )}
        </main>

        {/* Android Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          activeMedsCount={activeMedsCount}
          expiringVaccinesCount={expiringVaccinesCount}
        />
      </div>

      {/* Global Modals */}
      {isSOSOpen && (
        <SOSModal
          isOpen={isSOSOpen}
          onClose={() => setIsSOSOpen(false)}
          pet={activePet}
        />
      )}

      {isPassportOpen && (
        <HealthPassportModal
          isOpen={isPassportOpen}
          onClose={() => setIsPassportOpen(false)}
          pet={activePet}
          vaccinations={vaccinations}
          medications={medications}
          exams={exams}
          conditions={conditions}
        />
      )}

      {isNewPetOpen && (
        <NewPetModal
          isOpen={isNewPetOpen}
          onClose={() => setIsNewPetOpen(false)}
          onAddPet={handleAddPet}
        />
      )}

      {/* Feature 1: Medical Dossier / PDF Report */}
      {isMedicalReportOpen && (
        <MedicalReportModal
          isOpen={isMedicalReportOpen}
          onClose={() => setIsMedicalReportOpen(false)}
          pet={activePet}
          vaccinations={vaccinations}
          medications={medications}
          exams={exams}
          conditions={conditions}
          visits={visits}
        />
      )}

      {/* Feature 2: Toxicity Database */}
      {isToxicityOpen && (
        <ToxicityCheckerModal
          isOpen={isToxicityOpen}
          onClose={() => setIsToxicityOpen(false)}
          petSpecies={activePet.species}
          emergencyPhone={activePet.emergencyClinicPhone || activePet.vetPhone}
        />
      )}

      {/* Feature 3: AI Scanner */}
      {isAIScannerOpen && (
        <AIScannerModal
          isOpen={isAIScannerOpen}
          onClose={() => setIsAIScannerOpen(false)}
          pet={activePet}
          onDataAdded={reloadData}
        />
      )}

      {/* Feature 4: Nutrition & Calorie Calculator */}
      {isNutritionOpen && (
        <NutritionCalculatorModal
          isOpen={isNutritionOpen}
          onClose={() => setIsNutritionOpen(false)}
          pet={activePet}
        />
      )}

      {/* Feature 5: Pet Expenses & Budget */}
      {isExpensesOpen && (
        <ExpensesModal
          isOpen={isExpensesOpen}
          onClose={() => setIsExpensesOpen(false)}
          pet={activePet}
          visits={visits}
          onDataChanged={reloadData}
        />
      )}

      {/* Feature 6: Petsitter Mode */}
      {isPetsitterOpen && (
        <PetsitterModal
          isOpen={isPetsitterOpen}
          onClose={() => setIsPetsitterOpen(false)}
          pet={activePet}
          medications={medications}
        />
      )}

      {/* Dashboard Customizer (Show/Hide Widgets) */}
      {isCustomizerOpen && (
        <DashboardCustomizerModal
          isOpen={isCustomizerOpen}
          onClose={() => setIsCustomizerOpen(false)}
          config={dashboardConfig}
          onSaveConfig={handleSaveDashboardConfig}
        />
      )}

      {/* Tools Hub Menu */}
      {isToolsHubOpen && (
        <ToolsHubModal
          isOpen={isToolsHubOpen}
          onClose={() => setIsToolsHubOpen(false)}
          pet={activePet}
          onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
          onOpenToxicityChecker={() => setIsToxicityOpen(true)}
          onOpenAIScanner={() => setIsAIScannerOpen(true)}
          onOpenNutritionCalculator={() => setIsNutritionOpen(true)}
          onOpenExpenses={() => setIsExpensesOpen(true)}
          onOpenPetsitter={() => setIsPetsitterOpen(true)}
          onOpenDashboardCustomizer={() => setIsCustomizerOpen(true)}
          onOpenGoogleSync={() => setIsGoogleSyncOpen(true)}
          onOpenSettings={() => {
            // Can be opened from HeaderNav
            setIsToolsHubOpen(false);
          }}
        />
      )}

      {/* Google Drive Cloud Synchronization */}
      {isGoogleSyncOpen && (
        <GoogleSyncModal
          isOpen={isGoogleSyncOpen}
          onClose={() => setIsGoogleSyncOpen(false)}
          onDataRestored={reloadData}
        />
      )}
    </div>
  );
}
