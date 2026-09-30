/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  Monitor, 
  WifiOff, 
  AlertCircle,
  Plus,
  Cloud,
  QrCode,
  Camera,
  RefreshCw,
  Download
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

// Cloud Sync & QR Transfer
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { 
  checkDailyAutoSync, 
  getStoredSession, 
  subscribeToCloudSync, 
  uploadToCloud, 
  checkCloudBackup,
  downloadFromCloud,
  CloudSession 
} from './services/cloudSyncService';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { syncAllScheduledNotifications } from './services/notificationService';
import { AuthScreen } from './components/AuthScreen';
import { QRTransferModal } from './components/QRTransferModal';

// New Feature Modals
import { MedicalReportModal } from './components/MedicalReportModal';
import { ToxicityCheckerModal } from './components/ToxicityCheckerModal';
import { AIScannerModal } from './components/AIScannerModal';
import { NutritionCalculatorModal } from './components/NutritionCalculatorModal';
import { ExpensesModal } from './components/ExpensesModal';
import { PetsitterModal } from './components/PetsitterModal';
import { DashboardCustomizerModal } from './components/DashboardCustomizerModal';
import { ToolsHubModal } from './components/ToolsHubModal';
import { AgeCalculatorModal } from './components/AgeCalculatorModal';
import { EmergencyVetFinderModal } from './components/EmergencyVetFinderModal';
import { VetCardModal } from './components/VetCardModal';
import { HealthTimelineModal } from './components/HealthTimelineModal';
import { FamilySharingModal } from './components/FamilySharingModal';
import { CommercialPrivacyModal } from './components/CommercialPrivacyModal';

export default function App() {
  const { isInstalled } = usePWAInstall();
  const [session, setSession] = useState<CloudSession>(() => getStoredSession());
  const [pets, setPets] = useState<Pet[]>(() => {
    return storage.getPets();
  });
  const [activePetId, setActivePetId] = useState<string>(() => {
    return storage.getActivePetId();
  });
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAgeCalculatorOpen, setIsAgeCalculatorOpen] = useState(false);
  const [isEmergencyVetFinderOpen, setIsEmergencyVetFinderOpen] = useState(false);
  const [isVetCardOpen, setIsVetCardOpen] = useState(false);
  const [isHealthTimelineOpen, setIsHealthTimelineOpen] = useState(false);
  const [isFamilySharingOpen, setIsFamilySharingOpen] = useState(false);
  const [isCommercialPrivacyOpen, setIsCommercialPrivacyOpen] = useState(false);
  const [isQRTransferOpen, setIsQRTransferOpen] = useState(false);
  const [qrInitialMode, setQrInitialMode] = useState<'send' | 'receive'>('send');
  const [restoreToast, setRestoreToast] = useState<string | null>(null);

  // Auto-download and restore from Google Drive if user has 0 pets on device (e.g. after reinstalling or clean phone)
  useEffect(() => {
    let isMounted = true;
    if (session.user?.email && pets.length === 0) {
      downloadFromCloud().then((res) => {
        if (isMounted && res.petCount > 0) {
          reloadData();
          setRestoreToast(`Automatycznie pobrano ${res.petCount} zwierzaków z Twojego Dysku Google!`);
          setTimeout(() => setRestoreToast(null), 5000);
        }
      }).catch((err) => {
        console.warn('Silent auto-download from Drive on startup:', err);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [session.user?.email, pets.length]);

  // Preview Mode: Android phone frame vs Full screen
  const [deviceFrameMode, setDeviceFrameMode] = useState<'mobile' | 'full'>('mobile');

  // Theme Mode: Light / Dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('petcare_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('petcare_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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

  // Initialize daily background synchronization and push notifications
  useEffect(() => {
    // 1. Perform background auto-sync check on app startup
    checkDailyAutoSync().catch(() => {});
    syncAllScheduledNotifications().catch(() => {});

    // 2. Periodic check every 1 hour and on app visibility change
    const interval = setInterval(() => {
      checkDailyAutoSync().catch(() => {});
      syncAllScheduledNotifications().catch(() => {});
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

  // Load active pet data whenever activePet changes or cloud session changes
  const reloadData = () => {
    const currentPets = storage.getPets();
    setPets(currentPets);
    const targetPetId = activePetId || currentPets[0]?.id || '';
    if (targetPetId) {
      setActivePetId(targetPetId);
      setVaccinations(storage.getVaccinations(targetPetId));
      setMedications(storage.getMedications(targetPetId));
      setExams(storage.getExams(targetPetId));
      setConditions(storage.getConditions(targetPetId));
      setVisits(storage.getVisits(targetPetId));
    }
  };

  // Subscribe to Cloud Sync session changes (instant logout / login reaction)
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync((newSession) => {
      setSession(newSession);
      if (newSession.user) {
        const currentPets = storage.getPets();
        setPets(currentPets);
        const targetPetId = activePetId || currentPets[0]?.id || '';
        setActivePetId(targetPetId);
        if (targetPetId) {
          setVaccinations(storage.getVaccinations(targetPetId));
          setMedications(storage.getMedications(targetPetId));
          setExams(storage.getExams(targetPetId));
          setConditions(storage.getConditions(targetPetId));
          setVisits(storage.getVisits(targetPetId));
        }
      } else {
        setPets([]);
        setActivePetId('');
        setVaccinations([]);
        setMedications([]);
        setExams([]);
        setConditions([]);
        setVisits([]);
      }
    });
    return () => unsubscribe();
  }, [activePetId]);

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

  // Mutations with automatic cloud synchronization for authenticated user
  const handleSelectPet = (petId: string) => {
    setActivePetId(petId);
  };

  const handleUpdatePet = (updated: Pet) => {
    const newPets = pets.map(p => p.id === updated.id ? updated : p);
    setPets(newPets);
    storage.savePets(newPets);
    uploadToCloud().catch(() => {});
  };

  const handleAddPet = (newPet: Pet) => {
    const newPets = [...pets, newPet];
    setPets(newPets);
    storage.savePets(newPets);
    setActivePetId(newPet.id);
    uploadToCloud().catch(() => {});
  };

  const handleUpdateVaccinations = (items: Vaccination[]) => {
    const all = storage.getVaccinations();
    const other = all.filter(v => v.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveVaccinations(combined);
    setVaccinations(items);
    uploadToCloud().catch(() => {});
  };

  const handleUpdateMedications = (items: Medication[]) => {
    const all = storage.getMedications();
    const other = all.filter(m => m.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveMedications(combined);
    setMedications(items);
    uploadToCloud().catch(() => {});
  };

  const handleUpdateExams = (items: MedicalExam[]) => {
    const all = storage.getExams();
    const other = all.filter(e => e.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveExams(combined);
    setExams(items);
    uploadToCloud().catch(() => {});
  };

  const handleUpdateConditions = (items: MedicalCondition[]) => {
    const all = storage.getConditions();
    const other = all.filter(c => c.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveConditions(combined);
    setConditions(items);
    uploadToCloud().catch(() => {});
  };

  const handleUpdateVisits = (items: VetVisit[]) => {
    const all = storage.getVisits();
    const other = all.filter(v => v.petId !== activePet?.id);
    const combined = [...other, ...items];
    storage.saveVisits(combined);
    setVisits(items);
    uploadToCloud().catch(() => {});
  };

  const handleSaveDashboardConfig = (newCfg: DashboardConfig) => {
    setDashboardConfig(newCfg);
    storage.saveDashboardConfig(newCfg);
    uploadToCloud().catch(() => {});
  };

  // Badges & Alerts
  const [alertsDismissVersion, setAlertsDismissVersion] = useState(0);
  const activeMedsCount = medications.filter(m => m.isActive).length;
  const expiringVaccinesCount = vaccinations.filter(v => {
    const diff = (new Date(v.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).length;

  const upcomingAlerts = useMemo(() => {
    return getUpcomingAlerts(activePet, vaccinations, medications, visits, exams);
  }, [activePet, vaccinations, medications, visits, exams, alertsDismissVersion]);

  const handleDismissAlert = (alertId: string) => {
    storage.dismissAlert(alertId);
    setAlertsDismissVersion(v => v + 1);
  };

  const handleClearAllAlerts = () => {
    const ids = upcomingAlerts.map(a => a.id);
    storage.dismissAlerts(ids);
    setAlertsDismissVersion(v => v + 1);
  };

  // If user is not logged in: display the login/register screen only
  if (!session.user) {
    return (
      <AuthScreen
        onLoginSuccess={() => {
          reloadData();
        }}
      />
    );
  }

  // If user is logged in, but has not added any pet yet
  if (!activePet) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 sm:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-start sm:p-4 selection:bg-teal-500 selection:text-white transition-colors duration-200">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen sm:min-h-[860px] sm:max-h-[920px] sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-y-auto flex flex-col relative">
          <HeaderNav
            pets={[]}
            activePet={null}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSelectPet={handleSelectPet}
            onOpenNewPetModal={() => setIsNewPetOpen(true)}
            onOpenSOSModal={() => setIsSOSOpen(true)}
            onOpenPassportModal={() => setIsPassportOpen(true)}
            onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
            onOpenToxicityChecker={() => setIsToxicityOpen(true)}
            onOpenAIScanner={() => setIsAIScannerOpen(true)}
            onOpenToolsHub={() => setIsToolsHubOpen(true)}
            onOpenGoogleSync={() => setIsGoogleSyncOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenQRTransfer={() => { setQrInitialMode('receive'); setIsQRTransferOpen(true); }}
            onDataChanged={reloadData}
          />
          {!isInstalled && <PWAInstallBanner />}

          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-5">
            <div className="w-20 h-20 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/30 text-4xl">
              🐾
            </div>

            <div className="space-y-1.5 max-w-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-950 px-3 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Witaj w PetCare
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Twoja baza zwierzaków
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Zalogowano jako <strong className="text-teal-600 dark:text-teal-400">{session.user.email}</strong>. Wybierz jak chcesz rozpocząć:
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2.5 pt-1 text-left">
              {/* Option 1: QR Code instant transfer from another phone */}
              <button
                onClick={() => { setQrInitialMode('receive'); setIsQRTransferOpen(true); }}
                className="w-full p-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl shadow-md shadow-teal-600/25 active:scale-98 transition flex items-center gap-3 cursor-pointer group"
              >
                <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs sm:text-sm">Skanuj Kod QR z innego telefonu</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/25 rounded-md">Błyskawiczne</span>
                  </div>
                  <p className="text-[11px] text-teal-100 mt-0.5 leading-tight">
                    Przenosi natychmiast 100% zwierzaków, zdjęć i leków
                  </p>
                </div>
              </button>

              {/* Option 2: Restore from Cloud backup */}
              <button
                onClick={() => setIsGoogleSyncOpen(true)}
                className="w-full p-3.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-2xl shadow-xs active:scale-98 transition flex items-center gap-3 cursor-pointer"
              >
                <div className="p-2.5 bg-emerald-200/60 dark:bg-emerald-900/80 rounded-xl shrink-0">
                  <Cloud className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm block">Przywróć z Chmury / Dysku Google</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-tight">
                    Miałeś aplikację wcześniej? Pobierz zapisane zwierzaki
                  </p>
                </div>
              </button>

              {/* Option 3: Add new pet from scratch */}
              <button
                onClick={() => setIsNewPetOpen(true)}
                className="w-full p-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs active:scale-98 transition flex items-center gap-3 cursor-pointer"
              >
                <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl shrink-0">
                  <Plus className="w-5 h-5 text-teal-600 dark:text-teal-400 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm block">Dodaj nowego zwierzaka</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Rozpocznij tworzenie nowej książeczki zdrowia od zera
                  </p>
                </div>
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

        {isQRTransferOpen && (
          <QRTransferModal
            isOpen={isQRTransferOpen}
            initialMode={qrInitialMode}
            onClose={() => setIsQRTransferOpen(false)}
            onDataRestored={reloadData}
          />
        )}

        {restoreToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs animate-bounce">
            <Cloud className="w-4 h-4 text-emerald-100 animate-spin" />
            <span>{restoreToast}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 sm:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-start sm:p-4 selection:bg-teal-500 selection:text-white transition-colors duration-200">
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
        className={`w-full bg-slate-100 dark:bg-slate-900 flex flex-col relative transition-all duration-300 ${
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

        {/* Google Drive auto-restore notification */}
        {restoreToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs flex items-center justify-center gap-2 font-bold shadow-md animate-pulse">
            <Cloud className="w-4 h-4 text-emerald-100" />
            <span>{restoreToast}</span>
          </div>
        )}

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
          theme={theme}
          onToggleTheme={toggleTheme}
          onSelectPet={handleSelectPet}
          onOpenNewPetModal={() => setIsNewPetOpen(true)}
          onOpenSOSModal={() => setIsSOSOpen(true)}
          onOpenPassportModal={() => setIsPassportOpen(true)}
          onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
          onOpenToxicityChecker={() => setIsToxicityOpen(true)}
          onOpenAIScanner={() => setIsAIScannerOpen(true)}
          onOpenToolsHub={() => setIsToolsHubOpen(true)}
          onOpenGoogleSync={() => setIsGoogleSyncOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenQRTransfer={() => { setQrInitialMode('send'); setIsQRTransferOpen(true); }}
          onDataChanged={reloadData}
          alertCount={upcomingAlerts.length}
        />

        {/* Proactive Alerts Banner */}
        <AlertsBanner
          alerts={upcomingAlerts}
          onNavigateToTab={(tab) => setCurrentTab(tab)}
          onDismissAlert={handleDismissAlert}
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
              onSaveDashboardConfig={handleSaveDashboardConfig}
              onOpenDashboardCustomizer={() => setIsCustomizerOpen(true)}
              onOpenMedicalReport={() => setIsMedicalReportOpen(true)}
              onOpenToxicityChecker={() => setIsToxicityOpen(true)}
              onOpenAIScanner={() => setIsAIScannerOpen(true)}
              onOpenNutritionCalculator={() => setIsNutritionOpen(true)}
              onOpenExpenses={() => setIsExpensesOpen(true)}
              onOpenPetsitter={() => setIsPetsitterOpen(true)}
              onOpenAgeCalculator={() => setIsAgeCalculatorOpen(true)}
              onOpenEmergencyVetFinder={() => setIsEmergencyVetFinderOpen(true)}
              onOpenVetCard={() => setIsVetCardOpen(true)}
              onOpenHealthTimeline={() => setIsHealthTimelineOpen(true)}
              onOpenFamilySharing={() => setIsFamilySharingOpen(true)}
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
          onOpenEmergencyVetFinder={() => {
            setIsSOSOpen(false);
            setIsEmergencyVetFinderOpen(true);
          }}
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
          onOpenQRTransfer={() => {
            setIsToolsHubOpen(false);
            setQrInitialMode('send');
            setIsQRTransferOpen(true);
          }}
          onOpenNotifications={() => {
            setIsToolsHubOpen(false);
            setIsNotificationsOpen(true);
          }}
          onOpenAgeCalculator={() => {
            setIsToolsHubOpen(false);
            setIsAgeCalculatorOpen(true);
          }}
          onOpenEmergencyVetFinder={() => {
            setIsToolsHubOpen(false);
            setIsEmergencyVetFinderOpen(true);
          }}
          onOpenVetCard={() => {
            setIsToolsHubOpen(false);
            setIsVetCardOpen(true);
          }}
          onOpenHealthTimeline={() => {
            setIsToolsHubOpen(false);
            setIsHealthTimelineOpen(true);
          }}
          onOpenFamilySharing={() => {
            setIsToolsHubOpen(false);
            setIsFamilySharingOpen(true);
          }}
          onOpenPrivacyPolicy={() => {
            setIsToolsHubOpen(false);
            setIsCommercialPrivacyOpen(true);
          }}
          onOpenSettings={() => {
            // Can be opened from HeaderNav
            setIsToolsHubOpen(false);
          }}
        />
      )}

      {/* Feature 7: Human Age Calculator & Senior Care */}
      {isAgeCalculatorOpen && (
        <AgeCalculatorModal
          isOpen={isAgeCalculatorOpen}
          onClose={() => setIsAgeCalculatorOpen(false)}
          pet={activePet}
        />
      )}

      {/* Feature 8: 24/7 Veterinary Emergency Clinics & SOS */}
      {isEmergencyVetFinderOpen && (
        <EmergencyVetFinderModal
          isOpen={isEmergencyVetFinderOpen}
          onClose={() => setIsEmergencyVetFinderOpen(false)}
          pet={activePet}
          onUpdatePet={handleUpdatePet}
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

      {/* Push Notifications & Notification Center Modal */}
      {isNotificationsOpen && (
        <NotificationSettingsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          alerts={upcomingAlerts}
          onNavigateToTab={(tab) => setCurrentTab(tab)}
          onDismissAlert={handleDismissAlert}
          onClearAllAlerts={handleClearAllAlerts}
          initialTab={upcomingAlerts.length > 0 ? 'alerts' : 'alerts'}
        />
      )}

      {/* Direct QR Device-to-Device Transfer */}
      {isQRTransferOpen && (
        <QRTransferModal
          isOpen={isQRTransferOpen}
          initialMode={qrInitialMode}
          onClose={() => setIsQRTransferOpen(false)}
          onDataRestored={reloadData}
        />
      )}

      {/* Feature 9: Karta Pacjenta (Tryb Lekarza) */}
      {isVetCardOpen && (
        <VetCardModal
          isOpen={isVetCardOpen}
          onClose={() => setIsVetCardOpen(false)}
          pet={activePet}
          medications={medications}
          vaccinations={vaccinations}
          conditions={conditions}
          exams={exams}
        />
      )}

      {/* Feature 10: Zintegrowana Oś Czasu Zdrowia */}
      {isHealthTimelineOpen && (
        <HealthTimelineModal
          isOpen={isHealthTimelineOpen}
          onClose={() => setIsHealthTimelineOpen(false)}
          pet={activePet}
          vaccinations={vaccinations}
          exams={exams}
          visits={visits}
          medications={medications}
        />
      )}

      {/* Feature 11: Tryb Współwłaściciela i Rodzina */}
      {isFamilySharingOpen && (
        <FamilySharingModal
          isOpen={isFamilySharingOpen}
          onClose={() => setIsFamilySharingOpen(false)}
          pet={activePet}
          onOpenSyncModal={() => {
            setIsFamilySharingOpen(false);
            setIsGoogleSyncOpen(true);
          }}
        />
      )}

      {/* Feature 12: Prywatność, Bezpieczeństwo & Standard Google Play */}
      {isCommercialPrivacyOpen && (
        <CommercialPrivacyModal
          isOpen={isCommercialPrivacyOpen}
          onClose={() => setIsCommercialPrivacyOpen(false)}
          onDataReset={reloadData}
        />
      )}
    </div>
  );
}
