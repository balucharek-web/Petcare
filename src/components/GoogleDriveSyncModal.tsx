import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Cloud, 
  CloudRain, 
  CloudCheck, 
  UploadCloud, 
  DownloadCloud, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileJson,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logout, 
  findDriveSyncFile, 
  downloadPetDataFromDrive, 
  uploadPetDataToDrive, 
  DriveFileInfo,
  getAccessToken
} from '../services/googleDriveService';
import { storage } from '../services/storage';
import { getSampleDataJson } from '../services/sampleData';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  onDataRestored: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onDataRestored,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [driveFile, setDriveFile] = useState<DriveFileInfo | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Mandatory confirmation modal for destructive/overwriting operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Check remote drive file whenever user is logged in and modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      checkDriveStatus();
    }
  }, [isOpen, currentUser]);

  const checkDriveStatus = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const token = await getAccessToken();
      if (!token) {
        // Need to sign in or obtain token
        return;
      }
      const file = await findDriveSyncFile(token);
      setDriveFile(file);
      setLastChecked(new Date());
    } catch (err: any) {
      console.error('Błąd sprawdzania Dysku:', err);
      setMessage({ type: 'error', text: 'Nie udało się połączyć z Dyskiem Google. Spróbuj zalogować się ponownie.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const result = await googleSignIn();
      if (result) {
        onUserChanged(result.user);
        
        // Check Drive file status
        const file = await findDriveSyncFile(result.accessToken);
        setDriveFile(file);
        setLastChecked(new Date());

        if (file) {
          // File exists on Drive -> Automatically download and sync user's pets!
          try {
            const remoteJson = await downloadPetDataFromDrive(result.accessToken, file.id);
            const success = storage.importAllData(remoteJson);
            if (success) {
              onDataRestored();
              setMessage({
                type: 'success',
                text: `Zalogowano! Dane Twojego zwierzaka zostały automatycznie pobrane z Dysku Google (kopia z ${new Date(file.modifiedTime).toLocaleString('pl-PL')}).`
              });
            } else {
              setMessage({
                type: 'info',
                text: 'Znaleziono plik na Dysku Google, ale wymaga ręcznego zaimportowania.'
              });
            }
          } catch (dlErr: any) {
            console.error('Błąd automatycznego pobierania:', dlErr);
            setMessage({
              type: 'info',
              text: `Połączono z Dyskiem Google. Znaleziono plik z dnia ${new Date(file.modifiedTime).toLocaleDateString('pl-PL')}. Możesz go pobrać poniżej.`
            });
          }
        } else {
          // No file on Drive yet -> Account connected, waiting for user's own pet
          setDriveFile(null);
          setMessage({
            type: 'success',
            text: 'Połączono z Dyskiem Google! Twoje konto jest gotowe — gdy dodasz profil swojego pupila, jego dane zostaną tutaj bezpiecznie zapisane.'
          });
        }
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const isUnauthorizedDomain = err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'));
      if (isUnauthorizedDomain) {
        setMessage({
          type: 'info',
          text: 'Domena podglądu wymaga dodania do autoryzowanych domen Firebase Auth. Użyj głównego okna synchronizacji PetCare, aby kontynuować pracę z danymi.'
        });
      } else {
        setMessage({ type: 'error', text: err.message || 'Logowanie zostało przerwane.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await logout();
      onUserChanged(null);
      setDriveFile(null);
      setMessage({ type: 'info', text: 'Wylogowano z konta Google.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Błąd podczas wylogowywania.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Upload pet data to Google Drive (with explicit user confirmation as required by skill)
  const initiateUploadToDrive = () => {
    const isUpdate = !!driveFile;
    setConfirmModal({
      isOpen: true,
      title: isUpdate ? 'Zaktualizować dane na Dysku Google?' : 'Utworzyć kopię na Dysku Google?',
      description: isUpdate 
        ? `Czy na pewno chcesz nadpisać plik na Dysku Google aktualnymi danymi z tego urządzenia? Zmiana zastąpi poprzednią wersję w Twojej chmurze.`
        : `Aplikacja utworzy prywatny plik 'petcare_sync_data.json' na Twoim Dysku Google z kompletem danych profilu, leków, szczepień i wizyt.`,
      confirmText: isUpdate ? 'Zatwierdź i zaktualizuj' : 'Utwórz kopię w chmurze',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const token = await getAccessToken();
          if (!token) {
            throw new Error('Brak aktywnego tokenu Google. Zaloguj się ponownie.');
          }
          const currentData = storage.exportAllData();
          const updatedFile = await uploadPetDataToDrive(token, currentData, driveFile?.id);
          setDriveFile(updatedFile);
          setLastChecked(new Date());
          setMessage({
            type: 'success',
            text: 'Dane Twojego zwierzaka zostały pomyślnie zsynchronizowane z Dyskiem Google!'
          });
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Błąd wysyłania na Dysk Google.' });
        } finally {
          setIsLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Download pet data from Google Drive (with confirmation to avoid accidental local overwrite)
  const initiateDownloadFromDrive = () => {
    if (!driveFile) return;
    setConfirmModal({
      isOpen: true,
      title: 'Pobrać dane z Dysku Google na to urządzenie?',
      description: `Spowoduje to zastąpienie danych na tym telefonie/komputerze danymi z chmury z dnia ${new Date(driveFile.modifiedTime).toLocaleString('pl-PL')}. Wszystkie Twoje zwierzaki i wpisy zostaną zaktualizowane.`,
      confirmText: 'Pobierz i zastąp lokalne dane',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const token = await getAccessToken();
          if (!token) {
            throw new Error('Brak aktywnego tokenu Google. Zaloguj się ponownie.');
          }
          const jsonText = await downloadPetDataFromDrive(token, driveFile.id);
          const success = storage.importAllData(jsonText);
          if (success) {
            onDataRestored();
            setMessage({
              type: 'success',
              text: 'Dane zwierzaka zostały pomyślnie pobrane i załadowane z Dysku Google!'
            });
          } else {
            throw new Error('Pobrany plik z Dysku ma nieprawidłowy format.');
          }
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Błąd pobierania danych.' });
        } finally {
          setIsLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Synchronizacja z Dyskiem Google
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prywatna chmura – Twoje dane na Twoim koncie Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            title="Zamknij" aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Notification Message */}
          {message && (
            <div className={`p-3.5 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
              message.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : message.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Account Status Card */}
          {currentUser ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Awatar" 
                      className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                      {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {currentUser.displayName || 'Użytkownik Google'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Wyloguj
                </button>
              </div>

              {/* Cloud File Info */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <FileJson className="w-4 h-4 text-amber-500" />
                  <span>
                    Status chmury:{' '}
                    {driveFile ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Kopia aktywna ({new Date(driveFile.modifiedTime).toLocaleDateString('pl-PL')})
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        Brak pliku na Dysku
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={checkDriveStatus}
                  disabled={isLoading}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Odśwież
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-slate-800/60 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  Zaloguj się kontem Google
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto mt-1">
                  Synchronizuj dane swojego zwierzaka pomiędzy telefonem, tabletem i komputerem. Każdy użytkownik ma swoje własne, w 100% prywatne dane.
                </p>
              </div>

              {/* Official styled Google Sign In button */}
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold text-sm shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoading ? 'Łączenie...' : 'Zaloguj przez Google'}</span>
              </button>
            </div>
          )}

          {/* Sync Operations (Available when logged in) */}
          {currentUser && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Działania synchronizacji
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Download / Restore from Drive */}
                <button
                  onClick={initiateDownloadFromDrive}
                  disabled={!driveFile || isLoading}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    driveFile 
                      ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 hover:border-indigo-400 dark:hover:border-indigo-700 cursor-pointer shadow-sm hover:shadow' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <DownloadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        Pobierz z Dysku Google
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Pobierz dane na to urządzenie
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    {driveFile ? `Wersja z: ${new Date(driveFile.modifiedTime).toLocaleTimeString('pl-PL')}` : 'Brak pliku w chmurze'}
                  </div>
                </button>

                {/* Upload to Drive */}
                <button
                  onClick={initiateUploadToDrive}
                  disabled={isLoading}
                  className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-700 cursor-pointer text-left flex flex-col justify-between transition-all shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        Wyślij na Dysk Google
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Zapisz aktualny stan zwierzaka
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    {driveFile ? 'Zaktualizuj kopię na Dysku' : 'Utwórz nową kopię'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Educational Privacy & Multi-User Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Jak działa synchronizacja i prywatność?</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong>Każdy użytkownik ma swoje dane:</strong> Inna osoba po otwarciu aplikacji i zalogowaniu swoim kontem Google zobaczy wyłącznie swoje zwierzaki.
              </li>
              <li>
                <strong>Twoje urządzenia:</strong> Aby przenieść dane z telefonu na laptopa, wystarczy zalogować się tym samym kontem i kliknąć <em>„Pobierz z Dysku Google”</em>.
              </li>
              <li>
                <strong>Plik na Dysku:</strong> Aplikacja tworzy plik <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">petcare_sync_data.json</code> wyłącznie na Twoim Dysku Google.
              </li>
            </ul>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {lastChecked ? `Ostatnie sprawdzenie: ${lastChecked.toLocaleTimeString('pl-PL')}` : ''}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-semibold text-xs shadow-sm transition-all"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive / Mutating Operations */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.description}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {isLoading ? 'Przetwarzanie...' : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
