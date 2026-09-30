import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  CloudUpload, 
  CloudDownload, 
  ArrowRight,
  Sparkles,
  QrCode,
  Scan,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  getStoredSession,
  subscribeToCloudSync,
  signInWithGoogle,
  signOutGoogle,
  uploadToCloud,
  downloadFromCloud,
  generateQuickPairCode,
  pairWithQuickCode,
  exportBackupFile,
  CloudSession
} from '../services/cloudSyncService';
import { performSecureGoogleSignIn } from '../services/nativeGoogleAuth';
import { 
  createDeviceSyncQRCode,
  redeemDeviceSyncQRCode,
  countAllAttachments,
  QRSyncResult
} from '../services/qrSyncService';
import { QRScannerModal } from './QRScannerModal';
import { storage } from '../services/storage';
import { 
  googleSignIn as googleDriveSignIn,
  googleSignOut as googleDriveSignOut,
  uploadPetDataToDrive,
  downloadPetDataFromDrive,
  getAccessToken as getDriveAccessToken,
  getStoredSyncMetadata,
  SyncMetadata,
  subscribeToSyncUpdates
} from '../services/googleDriveSync';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

// Google "G" multi-color SVG icon
const GoogleGIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [session, setSession] = useState<CloudSession>(getStoredSession());
  const [showPinTab, setShowPinTab] = useState(false);
  const [driveMeta, setDriveMeta] = useState<SyncMetadata>(getStoredSyncMetadata());

  // QR Code Pairing & Camera Scanner
  const [qrSyncResult, setQrSyncResult] = useState<QRSyncResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrTimeRemaining, setQrTimeRemaining] = useState<string>('30:00');

  // Quick PIN pairing (kept for fallback)
  const [pinInput, setPinInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setDriveMeta(getStoredSyncMetadata());
    const unsubCloud = subscribeToCloudSync((s) => {
      setSession(s);
    });
    const unsubDrive = subscribeToSyncUpdates((m) => {
      setDriveMeta(m);
    });
    return () => {
      unsubCloud();
      unsubDrive();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Sign in securely with Google Account & Cloud Sync
  const handleDriveDirectLogin = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const account = await performSecureGoogleSignIn();
      if (account && account.email) {
        await signInWithGoogle(
          account.email, 
          account.idToken, 
          account.name, 
          account.photoUrl,
          account.androidProof,
          account.accessToken
        );
        setFeedback({
          type: 'success',
          message: `Zalogowano jako ${account.email}! Twoje zwierzaki są bezpiecznie zsynchronizowane.`
        });
        if (onDataRestored) {
          onDataRestored();
        }
      }
    } catch (err: any) {
      console.warn('Błąd połączenia z kontem Google:', err);
      const msg = err.message || '';
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        msg.includes('Anulowano') ||
        msg.includes('przerwane') ||
        msg.includes('cancel')
      ) {
        setFeedback({
          type: 'info',
          message: 'Wybór konta Google został anulowany.'
        });
      } else {
        setFeedback({
          type: 'error',
          message: msg || 'Nie udało się połączyć z kontem Google.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOutGoogle();
    googleDriveSignOut().catch(() => {});
    setGeneratedCode(null);
    setFeedback({
      type: 'info',
      message: 'Wylogowano z konta Google. Dane lokalne zostały wyczyszczone z urządzenia.'
    });
    if (onDataRestored) {
      onDataRestored();
    }
  };

  // Manual Instant Upload/Sync exclusively to personal Google Drive
  const handleManualUpload = async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await uploadToCloud();
      setFeedback({
        type: 'success',
        message: `Pomyślnie zapisano ${res.petCount} zwierzaków na Twoim prywatnym Dysku Google (plik petcare_app_data.json)!`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd zapisu na Dysku Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Instant Download/Restore exclusively from personal Google Drive
  const handleManualDownload = async () => {
    setShowRestoreConfirm(false);
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await downloadFromCloud();
      setFeedback({
        type: 'success',
        message: `Pobrano dane z Twojego Dysku Google! Przywrócono ${res.petCount} zwierzaków wraz z historią medyczną.`
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie znaleziono pliku kopii na Twoim Dysku Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQRCode = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await createDeviceSyncQRCode();
      setQrSyncResult(res);
      setFeedback({
        type: 'success',
        message: `Wygenerowano Kod QR z ${res.petCount} zwierzakami i ${res.scansCount} załącznikami (zdjęcia, badania, szczepienia). Skieruj aparat drugiego telefonu na kod.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się wygenerować kodu QR do synchronizacji.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQRSuccess = async (scannedText: string) => {
    setIsScannerOpen(false);
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await redeemDeviceSyncQRCode(scannedText);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setFeedback({
        type: 'success',
        message: `✅ Sukces! Pomyślnie zsynchronizowano wszystkie dane: ${res.petCount} zwierzaków oraz ${res.attachmentsCount} załączników (zdjęcia, wyniki badań, historia leczenia).`,
      });

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd synchronizacji przez kod QR. Upewnij się, że kod nie wygasł.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.pets)) {
          throw new Error('Wybrany plik nie zawiera prawidłowej bazy zwierzaków PetCare.');
        }
        storage.importAllData(text);
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {}
        setFeedback({
          type: 'success',
          message: `✅ Pomyślnie wczytano kopię! Przywrócono ${parsed.pets.length} zwierzaków.`,
        });
        if (onDataRestored) {
          onDataRestored();
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Błąd odczytu pliku kopii zapasowej.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleGeneratePin = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await generateQuickPairCode();
      setGeneratedCode(res.code);
      setFeedback({
        type: 'success',
        message: 'Wygenerowano 6-cyfrowy kod PIN. Wpisz go na drugim telefonie, aby natychmiast skopiować zwierzaki.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd generowania kodu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = pinInput.trim();
    if (!rawVal) {
      setFeedback({ type: 'error', message: 'Wpisz kod transferu lub 6-cyfrowy PIN.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      if (rawVal.startsWith('pc_sync_') || rawVal.includes('{')) {
        const res = await redeemDeviceSyncQRCode(rawVal);
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {}
        setFeedback({
          type: 'success',
          message: `✅ Sukces! Zsynchronizowano ${res.petCount} zwierzaków i ${res.attachmentsCount} załączników (zdjęcia, badania).`,
        });
      } else {
        const clean = rawVal.replace(/\D/g, '');
        const res = await pairWithQuickCode(clean);
        setFeedback({
          type: 'success',
          message: `Połączono pomyślnie! Przywrócono ${res.petCount} zwierzaków z konta ${res.user.email}.`,
        });
      }

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nieprawidłowy kod lub kod wygasł.',
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

  const isSignedIn = !!session.user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-slate-100 dark:border-slate-800 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center">
              <GoogleGIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Konto Google</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Logowanie bez hasła i synchronizacja chmurowa</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback notification */}
          {feedback && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm animate-fadeIn ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                : feedback.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
            }`}>
              {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {feedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {feedback.type === 'info' && <GoogleGIcon className="w-5 h-5 shrink-0 mt-0.5" />}
              <div className="flex-1 font-medium">{feedback.message}</div>
            </div>
          )}

          {/* STATE 1: ALREADY LOGGED IN WITH GOOGLE */}
          {isSignedIn ? (
            <div className="space-y-4">
              {/* Google Profile Card */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={session.user?.avatar || `https://ui-avatars.com/api/?name=${session.user?.name}&background=0D9488&color=fff`} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-xs object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-0.5 rounded-full shadow-xs">
                      <GoogleGIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{session.user?.name}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{session.user?.email}</p>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      ✓ Połączono z Google • Kopia aktywna
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 text-xs text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 hover:bg-teal-100/60 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer font-medium shadow-2xs"
                    title="Przełącz na inne konto Google"
                  >
                    <span>Zmień konto</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Wyloguj się z Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Wyloguj</span>
                  </button>
                </div>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ostatnia synchronizacja
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 font-bold">{formatLastSync(session.lastSyncTime)}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synchronizacja w tle
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">Włączona (co 24h)</div>
                </div>
              </div>

              {/* PROMINENT MANUAL SYNC BUTTONS (Google Drive & Cloud) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Dysk Google i Chmura
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    Plik: petcare_app_data.json
                  </span>
                </div>

                <button
                  onClick={handleManualUpload}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Zapisywanie...' : '💾 Zapisz dane na Twoim Dysku Google'}</span>
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                >
                  <CloudDownload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>📥 Pobierz dane z Dysku Google (Przywróć zwierzaki)</span>
                </button>
              </div>

              {/* Multi-Device Transfer via QR CODE */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200/80 dark:border-teal-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                      Synchronizacja Kodem QR (Drugi telefon)
                    </span>
                  </div>
                  {!qrSyncResult && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleGenerateQRCode}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Nadaj (Pokaż)</span>
                      </button>
                      <button
                        onClick={() => setIsScannerOpen(true)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Odbierz (Skanuj)</span>
                      </button>
                    </div>
                  )}
                </div>

                {qrSyncResult ? (
                  <div className="space-y-3 pt-1 text-center">
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Otwórz PetCare na drugim telefonie i wybierz <strong>„Skanuj Kod QR”</strong>:
                    </p>

                    <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-teal-500 inline-block mx-auto">
                      <img
                        src={qrSyncResult.qrCodeDataUrl}
                        alt="Kod QR synchronizacji"
                        className="w-56 h-56 sm:w-64 sm:h-64 rounded-xl mx-auto"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-teal-900 dark:text-teal-200 font-semibold bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                        🐾 {qrSyncResult.petCount} zwierzaków
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                        📎 {qrSyncResult.scansCount} załączników (zdjęcia, badania, szczepienia)
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ⏱️ Ważny przez 30 minut
                      </span>
                    </div>

                    <button
                      onClick={handleGenerateQRCode}
                      className="text-xs text-teal-700 dark:text-teal-300 hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Odśwież kod QR
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Chcesz przenieść wszystkie dane na drugi telefon? Kliknij <strong>„Pokaż Kod QR”</strong>, a na drugim urządzeniu użyj wbudowanego skanera aparatu. Wszystkie zdjęcia, badania i leki zostaną skopiowane natychmiast.
                  </p>
                )}
              </div>

              {/* Restore Confirmation Dialog */}
              {showRestoreConfirm && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">Potwierdź wczytanie z chmury</h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        Pobranie danych zastąpi zwierzaki na tym urządzeniu wersją zapisaną w chmurze Google. Kontynuować?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRestoreConfirm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleManualDownload}
                      className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                    >
                      Tak, wczytaj dane
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STATE 2: NOT SIGNED IN (True Multi-User Google Sign-In with Account Selection) */
            <div className="space-y-4">
              <div className="text-center space-y-1.5 py-1">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto shadow-xs">
                  <GoogleGIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Wybierz konto Google
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Zaloguj się swoim kontem Google, aby zarządzać swoimi zwierzakami, lekami i badaniami w chmurze.
                </p>
              </div>

              {/* Standard Official Google Sign-In */}
              <div className="space-y-3 pt-1">
                {/* Official Google Connect Button */}
                <button
                  type="button"
                  onClick={handleDriveDirectLogin}
                  disabled={isLoading}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer text-sm"
                >
                  <div className="bg-white p-1 rounded-lg">
                    <GoogleGIcon className="w-5 h-5" />
                  </div>
                  <span>
                    {isLoading 
                      ? 'Autoryzacja konta Google...' 
                      : 'Zaloguj się przez Google'}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 py-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span>Kryptograficznie bezpieczna autoryzacja OAuth 2.0 / OpenID Connect</span>
                </div>
              </div>

              {/* QR Code Scanner for second phone transfer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold rounded-2xl shadow-md shadow-teal-600/25 flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer text-sm"
                >
                  <Scan className="w-5 h-5 text-white" />
                  <span>Skanuj Kod QR z pierwszego telefonu</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <span>Przenosi 100% danych ze zdjęciami i badaniami.</span>
                  <button
                    type="button"
                    onClick={() => setShowPinTab(!showPinTab)}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    {showPinTab ? 'Ukryj kod ręczny' : 'Wpisz kod ręcznie'}
                  </button>
                </div>

                {showPinTab && (
                  <form onSubmit={handlePairPinSubmit} className="mt-2 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl animate-fadeIn">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Wklej kod QR lub identyfikator transferu:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="np. pc_sync_... lub 6 cyfr"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !pinInput}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Pobierz
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Offline backup option (Always available) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Kopia do pliku w telefonie:
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportBackupFile}
                className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Pobierz .JSON
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <label className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer">
                Wczytaj .JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportJsonFile}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Szyfrowanie SSL & Bezpieczeństwo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanQRSuccess}
      />
    </div>
  );
};
