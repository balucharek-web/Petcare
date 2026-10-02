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
  RefreshCw,
  Sun,
  Moon,
  Bell,
  LogOut,
  QrCode,
  Trash2
} from 'lucide-react';
import { Pet } from '../types/pet';
import { storage } from '../services/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getStoredSession, subscribeToCloudSync, manualSyncNow, signOut, CloudSession } from '../services/cloudSyncService';
import { DeletePetConfirmModal } from './DeletePetConfirmModal';

interface HeaderNavProps {
  pets: Pet[];
  activePet: Pet | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSelectPet: (petId: string) => void;
  onDeletePet?: (petId: string) => void;
  onOpenNewPetModal: () => void;
  onOpenSOSModal: () => void;
  onOpenPassportModal: () => void;
  onOpenMedicalReport: () => void;
  onOpenToxicityChecker: () => void;
  onOpenAIScanner: () => void;
  onOpenToolsHub: () => void;
  onOpenGoogleSync: () => void;
  onOpenNotifications: () => void;
  onOpenQRTransfer?: () => void;
  onDataChanged: () => void;
  alertCount?: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  pets,
  activePet,
  theme = 'light',
  onToggleTheme,
  onSelectPet,
  onDeletePet,
  onOpenNewPetModal,
  onOpenSOSModal,
  onOpenPassportModal,
  onOpenMedicalReport,
  onOpenToxicityChecker,
  onOpenAIScanner,
  onOpenToolsHub,
  onOpenGoogleSync,
  onOpenNotifications,
  onOpenQRTransfer,
  onDataChanged,
  alertCount = 0,
}) => {
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
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

  const handleLogout = () => {
    signOut();
    setShowSettingsModal(false);
    onDataChanged();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Pet Selector Button */}
          <div className="relative min-w-0 flex-shrink">
            <button
              onClick={() => setShowPetDropdown(!showPetDropdown)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-2xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-98 border border-slate-200/90 dark:border-slate-700/80 shadow-xs max-w-[170px] sm:max-w-none text-left"
            >
              <div className="relative shrink-0">
                <img
                  src={activePet?.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                  alt={activePet?.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-2 ring-teal-500 shadow-xs bg-white shrink-0"
                />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-teal-600 text-white rounded-full flex items-center justify-center text-[9px] sm:text-[10px] shadow-xs">
                  {activePet?.species === 'dog' ? '🐶' : activePet?.species === 'cat' ? '🐱' : '🐾'}
                </span>
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate">
                    {activePet?.name || 'Wybierz'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight truncate font-medium">
                  {activePet?.breed || 'Mieszaniec'}
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
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-40 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Twoje zwierzaki
                  </div>
                  {pets.map((p) => (
                    <div
                      key={p.id}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        p.id === activePet?.id ? 'bg-teal-50/70 dark:bg-teal-950/50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPet(p.id);
                          setShowPetDropdown(false);
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <img
                          src={p.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                        <div className="truncate flex-1 min-w-0">
                          <p className={`text-xs truncate ${p.id === activePet?.id ? 'font-bold text-teal-900 dark:text-teal-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{p.breed || 'Zwierzak'}</p>
                        </div>
                        {p.id === activePet?.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                        )}
                      </button>

                      {onDeletePet && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPetDropdown(false);
                            setPetToDelete(p);
                          }}
                          title={`Usuń profil: ${p.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 px-2">
                    <button
                      onClick={() => {
                        setShowPetDropdown(false);
                        onOpenNewPetModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-xs font-semibold transition"
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
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Cloud Sync & Manual Trigger */}
            <div className="relative flex items-center">
              {session.user ? (
                <div className="flex items-center bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl p-0.5 shadow-2xs">
                  <button
                    onClick={onOpenGoogleSync}
                    title={`Konto Google: ${session.user.email} (kliknij, aby otworzyć panel)`}
                    className="flex items-center gap-1 px-2 py-1 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 text-xs font-bold transition rounded-lg"
                  >
                    <div className="relative">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                    <span className="hidden sm:inline text-[11px]">Chmura</span>
                  </button>
                  <button
                    onClick={handleQuickSync}
                    disabled={isQuickSyncing}
                    title="Ręczna synchronizacja: kliknij, aby zsynchronizować teraz"
                    className="p-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isQuickSyncing ? 'animate-spin text-teal-600' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenGoogleSync}
                  title="Zaloguj się kontem Google bez hasła, aby włączyć synchronizację"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline text-[11px]">Konto Google</span>
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

            {/* Direct QR Transfer / Drugi telefon */}
            {onOpenQRTransfer && (
              <button
                onClick={onOpenQRTransfer}
                title="Transfer między telefonami: Nadaj lub skanuj kod QR z innego telefonu"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/80 hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition text-xs font-bold shadow-2xs cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="hidden sm:inline text-[11px]">Kod QR</span>
              </button>
            )}

            {/* Quick action buttons on larger screens (hidden on mobile to keep header clean and prevent overlapping) */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={onOpenAIScanner}
                title="Inteligentny Skaner AI (Recepty, leki, krew)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white active:scale-95 transition text-xs font-bold shadow-2xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Skaner AI</span>
              </button>

              <button
                onClick={onOpenMedicalReport}
                title="Raport Medyczny & Książeczka PDF"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60 active:scale-95 transition text-xs font-bold border border-teal-200 dark:border-teal-800 shadow-2xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Raport PDF</span>
              </button>

              <button
                onClick={onOpenSOSModal}
                title="Karta Ratunkowa SOS"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition text-xs font-bold border border-rose-200 dark:border-rose-800 shadow-2xs cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <span>SOS</span>
              </button>
            </div>

            {/* Tools Menu Hub */}
            <button
              onClick={onOpenToolsHub}
              title="Wszystkie Narzędzia (Toksyczność, Skaner AI, Kalkulator, Petsitter, Wydatki)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 active:scale-95 transition text-xs font-bold border border-teal-200/80 dark:border-teal-800/80 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Menu</span>
            </button>

            {/* Notifications Button (Notification Center) */}
            <button
              onClick={onOpenNotifications}
              title={alertCount > 0 ? `Centrum powiadomień (${alertCount} ${alertCount === 1 ? 'nowy alert' : 'nowe alerty'})` : 'Centrum powiadomień (Brak nowych alertów)'}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer relative"
              aria-label="Centrum powiadomień"
            >
              <Bell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            {/* Subtler Theme Toggle (Light / Dark mode) */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                aria-label="Przełącz tryb motywu"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors" />
                )}
              </button>
            )}

            {/* Settings & Backup */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Kopia zapasowa i opcje"
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
              aria-label="Ustawienia"
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
              {/* Notifications Option in Settings */}
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenNotifications();
                }}
                className="w-full flex items-center justify-between py-3 px-4 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 rounded-2xl text-xs font-bold transition active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-teal-600" />
                  <span>Powiadomienia w telefonie (Alerty)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">
                  Ustawienia
                </span>
              </button>

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

              {session.user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Wyloguj się ({session.user.email})</span>
                </button>
              )}

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

      {petToDelete && (
        <DeletePetConfirmModal
          isOpen={true}
          pet={petToDelete}
          onClose={() => setPetToDelete(null)}
          onConfirmDelete={(id) => {
            onDeletePet?.(id);
            setPetToDelete(null);
          }}
          isLastPet={pets.length === 1}
        />
      )}
    </>
  );
};
