import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudUpload, 
  CloudDownload, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Smartphone, 
  ShieldCheck, 
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  googleSignIn, 
  googleSignOut, 
  uploadPetDataToDrive, 
  downloadPetDataFromDrive, 
  getStoredSyncMetadata, 
  subscribeToSyncUpdates, 
  SyncMetadata,
  auth
} from '../services/googleDriveSync';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>(getStoredSyncMetadata());
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    setSyncMeta(getStoredSyncMetadata());
    const unsubscribe = subscribeToSyncUpdates((meta) => {
      setSyncMeta(meta);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await googleSignIn();
      setFeedback({
        type: 'success',
        message: `Zalogowano jako ${res.user.displayName || res.user.email}! Możesz teraz przesłać lub pobrać dane z Dysku Google.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Logowanie nie powiodło się. Spróbuj ponownie.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await googleSignOut();
      setFeedback({
        type: 'info',
        message: 'Wylogowano z Dysku Google.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd podczas wylogowywania.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await uploadPetDataToDrive();
      setFeedback({
        type: 'success',
        message: 'Dane Twoich zwierzaków zostały pomyślnie zapisane na Twoim prywatnym Dysku Google!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się zapisać danych na Dysku Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadConfirm = async () => {
    setShowRestoreConfirm(false);
    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await downloadPetDataFromDrive();
      setFeedback({
        type: 'success',
        message: `Pobrano pomyślnie! Przywrócono ${result.petCount} zwierzaków wraz z ich całą historią medyczną.`
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się pobrać danych z Dysku Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Jeszcze nie zsynchronizowano';
    try {
      const date = new Date(iso);
      return date.toLocaleString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const isSignedIn = !!auth.currentUser || !!syncMeta.userEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Synchronizacja z Dyskiem Google</h2>
              <p className="text-xs text-emerald-100">Kopia w chmurze i dostęp na wielu urządzeniach</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback Banner */}
          {feedback && (
            <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}>
              {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {feedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {feedback.type === 'info' && <Cloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1 font-medium">{feedback.message}</div>
            </div>
          )}

          {/* User state */}
          {isSignedIn ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {syncMeta.userPhoto ? (
                    <img 
                      src={syncMeta.userPhoto} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border border-gray-200 shadow-xs" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center">
                      {(syncMeta.userName || syncMeta.userEmail || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{syncMeta.userName || 'Użytkownik Google'}</h3>
                    <p className="text-xs text-gray-500">{syncMeta.userEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-medium text-emerald-700">Połączono z Dyskiem Google</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                  title="Wyloguj się"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Wyloguj
                </button>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ostatnia synchronizacja
                  </div>
                  <div className="text-gray-700 font-medium">{formatLastSync(syncMeta.lastSyncTime)}</div>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tło (raz dziennie)
                  </div>
                  <div className="text-emerald-600 font-medium">Aktywna w tle (24h)</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-5 h-5" />
                  )}
                  Wyślij dane na Dysk Google (Zapisz kopię)
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <CloudDownload className="w-5 h-5 text-teal-600" />
                  Pobierz dane z Dysku Google (Wczytaj na to urządzenie)
                </button>
              </div>

              {/* Confirm download / overwrite dialog */}
              {showRestoreConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Potwierdź pobranie danych</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        Pobranie kopii z Dysku Google zastąpi dane zwierzaków na tym urządzeniu aktualną wersją z chmury. Czy chcesz kontynuować?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRestoreConfirm(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-white rounded-lg border border-gray-200"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleDownloadConfirm}
                      className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                    >
                      Tak, wczytaj z Dysku
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 text-center">
              {/* Feature Highlights */}
              <div className="grid grid-cols-1 gap-2.5 text-left">
                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Synchronizacja między telefonami</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Zaloguj się na drugim telefonie lub tablecie, a aplikacja natychmiast wczyta Twoje zwierzaki.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Automatyczny zapis w tle raz na dzień</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Nie musisz o niczym pamiętać – raz na 24h aplikacja cicho odświeża kopię zapasową.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">100% prywatności na Twoim Dysku</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Plik z danymi jest zapisywany bezpośrednio na Twoim prywatnym Dysku Google.
                    </p>
                  </div>
                </div>
              </div>

              {/* Official Google Sign-In Button */}
              <div className="pt-2 flex flex-col items-center">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  type="button"
                  className="w-full max-w-sm py-3 px-5 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold rounded-xl shadow-xs flex items-center justify-center gap-3 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>{isLoading ? 'Logowanie...' : 'Zaloguj się przez Google'}</span>
                </button>
                <p className="text-[11px] text-gray-400 mt-2">
                  Dostęp tylko do dedykowanego pliku kopii zapasowej PetCare
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Format: JSON bezstratny
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
