import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  Plus, 
  ChevronDown, 
  Settings, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles,
  Heart,
  Smartphone,
  Maximize2,
  Minimize2,
  Camera,
  Grid,
  Cloud,
  RefreshCw
} from 'lucide-react';
import { Pet } from '../types/pet';
import { storage } from '../services/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getStoredSession, subscribeToCloudSync, manualSyncNow, CloudSession } from '../services/cloudSyncService';

interface HeaderNavProps {
  pets: Pet[];
  activePet: Pet | null;
  onSelectPet: (petId: string) => void;
  onOpenNewPetModal: () => void;
  onOpenSOSModal: () => void;
  onOpenPassportModal: () => void;
  onOpenMedicalReport: () => void;
  onOpenToxicityChecker: () => void;
  onOpenAIScanner: () => void;
  onOpenToolsHub: () => void;
  onOpenGoogleSync: () => void;
  onDataChanged: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  pets,
  activePet,
  onSelectPet,
  onOpenNewPetModal,
  onOpenSOSModal,
  onOpenPassportModal,
  onOpenMedicalReport,
  onOpenToxicityChecker,
  onOpenAIScanner,
  onOpenToolsHub,
  onOpenGoogleSync,
  onDataChanged,
}) => {
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [session, setSession] = useState<CloudSession>(getStoredSession());
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const { install, isInstalled } = usePWAInstall();

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.user) {
      onOpenGoogleSync();
      return;
    }
    setIsQuickSyncing(true);
    try {
      const res = await manualSyncNow();
      setSyncToast(`Zsynchronizowano (${res.petCount} zw.)`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch {
      setSyncToast('Błąd synchronizacji');
      setTimeout(() => setSyncToast(null), 3000);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = subscribeToCloudSync((s) => {
      setSession(s);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  const handleExportBackup = () => {
    const json = storage.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petcare_kopia_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const ok = storage.importAllData(text);
        if (ok) {
          alert('Dane zostały pomyślnie zaimportowane!');
          onDataChanged();
          setShowSettingsModal(false);
        } else {
          alert('Błąd importu pliku JSON.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    storage.clearAllData();
    onDataChanged();
    setShowSettingsModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Pet Selector Button */}
          <div className="relative">
            <button
              onClick={() => setShowPetDropdown(!showPetDropdown)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 transition active:scale-98 border border-transparent hover:border-slate-200"
            >
              <div className="relative">
                <img
                  src={activePet?.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                  alt={activePet?.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-teal-500 shadow-xs"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px]">
                  {activePet?.species === 'dog' ? '🐶' : activePet?.species === 'cat' ? '🐱' : '🐾'}
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm text-slate-900 leading-tight">
                    {activePet?.name || 'Wybierz'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-[11px] text-slate-500 block leading-none">
                  {activePet?.breed || 'Zwierzak'}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showPetDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowPetDropdown(false)} 
                />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-40 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Twoje zwierzaki
                  </div>
                  {pets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPet(p.id);
                        setShowPetDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition ${
                        p.id === activePet?.id ? 'bg-teal-50/70 text-teal-900 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                      <div className="truncate flex-1">
                        <p className="text-sm truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{p.breed || 'Zwierzak'}</p>
                      </div>
                      {p.id === activePet?.id && (
                        <span className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </button>
                  ))}

                  <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                    <button
                      onClick={() => {
                        setShowPetDropdown(false);
                        onOpenNewPetModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Dodaj nowego zwierzaka
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud Sync & Manual Trigger */}
            <div className="relative flex items-center">
              {session.user ? (
                <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-2xl p-0.5 shadow-xs">
                  <button
                    onClick={onOpenGoogleSync}
                    title={`Konto Google: ${session.user.email} (kliknij, aby otworzyć panel)`}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-emerald-800 hover:text-emerald-950 text-xs font-bold transition rounded-xl"
                  >
                    <div className="relative">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                    <span className="hidden sm:inline">Chmura</span>
                  </button>
                  <button
                    onClick={handleQuickSync}
                    disabled={isQuickSyncing}
                    title="Ręczna synchronizacja: kliknij, aby zsynchronizować teraz"
                    className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isQuickSyncing ? 'animate-spin text-teal-600' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenGoogleSync}
                  title="Zaloguj się kontem Google bez hasła, aby włączyć synchronizację"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-95 transition text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Konto Google</span>
                </button>
              )}

              {/* Toast for quick sync */}
              {syncToast && (
                <div className="absolute top-full mt-1.5 right-0 whitespace-nowrap px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-lg z-50 animate-fadeIn flex items-center gap-1">
                  <span>✓</span>
                  <span>{syncToast}</span>
                </div>
              )}
            </div>

            {/* AI Scanner Button */}
            <button
              onClick={onOpenAIScanner}
              title="Inteligentny Skaner AI (Recepty, leki, krew)"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white active:scale-95 transition text-xs font-bold shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Skaner AI</span>
            </button>

            {/* Medical Report / Passport PDF */}
            <button
              onClick={onOpenMedicalReport}
              title="Raport Medyczny & Książeczka PDF"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-teal-50 text-teal-800 hover:bg-teal-100 active:scale-95 transition text-xs font-bold border border-teal-200 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Raport PDF</span>
            </button>

            {/* SOS Emergency button */}
            <button
              onClick={onOpenSOSModal}
              title="Karta Ratunkowa SOS"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 transition text-xs font-bold border border-rose-200 shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="hidden sm:inline">SOS</span>
            </button>

            {/* Tools Menu Hub */}
            <button
              onClick={onOpenToolsHub}
              title="Wszystkie Narzędzia (Toksyczność, Kalkulator, Petsitter, Wydatki)"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95 transition text-xs font-bold border border-slate-200 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Menu</span>
            </button>

            {/* Settings & Backup */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Kopia zapasowa i opcje"
              className="p-2 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings & Backup Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                Ustawienia i Kopia Danych
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Wszystkie dane medyczne Twojego zwierzaka są bezpiecznie przechowywane na Twoim urządzeniu. Możesz pobrać plik kopii zapasowej lub wgrać go na innym telefonie.
            </p>

            <div className="space-y-3">
              {/* Cloud Sync Option in Settings */}
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenGoogleSync();
                }}
                className="w-full flex items-center justify-between py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold transition active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>Synchronizacja w Chmurze</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                  {session.user ? 'Połączono' : 'Auto 24h'}
                </span>
              </button>

              {!isInstalled && (
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    install();
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow transition active:scale-98"
                >
                  <Smartphone className="w-4 h-4" />
                  Zainstaluj aplikację na telefonie (PWA)
                </button>
              )}

              <a
                href="/PetCare.apk"
                download="PetCare.apk"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow transition active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                Pobierz instalator APK na Androida
              </a>

              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow transition active:scale-98"
              >
                <Download className="w-4 h-4" />
                Pobierz kopię zapasową (JSON)
              </button>

              <label className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold cursor-pointer transition active:scale-98">
                <Upload className="w-4 h-4 text-slate-600" />
                Przywróć dane z pliku
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleResetData}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Wyczyść wszystkie dane aplikacji
              </button>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
              PetCare v1.0 • Aplikacja mobilna dla zwierząt
            </div>
          </div>
        </div>
      )}
    </>
  );
};
