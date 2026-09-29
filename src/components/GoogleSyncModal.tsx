import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Smartphone, 
  ShieldCheck, 
  Clock,
  Download,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  CloudUpload,
  CloudDownload,
  UserCheck
} from 'lucide-react';
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

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [session, setSession] = useState<CloudSession>(getStoredSession());
  const [activeTab, setActiveTab] = useState<'google' | 'pin'>('google');
  
  // Custom Google account input
  const [showCustomAccount, setShowCustomAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  
  // Quick PIN pairing
  const [pinInput, setPinInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    const unsubscribe = subscribeToCloudSync((s) => {
      setSession(s);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // 1-Click Google Sign-In with predefined or chosen account
  const handleGoogleAccountClick = async (email: string, name: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await signInWithGoogle(email, name);
      setFeedback({
        type: 'success',
        message: `Zalogowano pomyślnie z kontem Google (${email})! Twoja kopia zapasowa została automatycznie zsynchronizowana w chmurze.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się połączyć z kontem Google.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Wpisz poprawny adres e-mail konta Google.' });
      return;
    }
    const name = customEmail.split('@')[0];
    handleGoogleAccountClick(customEmail.trim(), name);
  };

  const handleSignOut = () => {
    signOutGoogle();
    setGeneratedCode(null);
    setFeedback({
      type: 'info',
      message: 'Wylogowano z konta Google.'
    });
  };

  const handleManualUpload = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await uploadToCloud();
      setFeedback({
        type: 'success',
        message: `Kopia w chmurze zaktualizowana! Zapisano ${res.petCount} zwierzaków na Twoim koncie.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd zapisu w chmurze.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualDownload = async () => {
    setShowRestoreConfirm(false);
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await downloadFromCloud();
      setFeedback({
        type: 'success',
        message: `Pobrano dane z chmury! Przywrócono ${res.petCount} zwierzaków wraz z badaniami i apteczką.`
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się pobrać danych z chmury.'
      });
    } finally {
      setIsLoading(false);
    }
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
    const clean = pinInput.replace(/\D/g, '');
    if (clean.length < 6) {
      setFeedback({ type: 'error', message: 'Wpisz pełny 6-cyfrowy kod PIN.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await pairWithQuickCode(clean);
      setFeedback({
        type: 'success',
        message: `Połączono pomyślnie! Przywrócono ${res.petCount} zwierzaków z konta ${res.user.email}.`
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nieprawidłowy kod PIN lub kod wygasł.'
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
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center">
              <GoogleGIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Konto Google</h2>
              <p className="text-xs text-gray-500">Synchronizacja i kopia zapasowa w chmurze</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
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
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
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
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={session.user?.avatar || `https://ui-avatars.com/api/?name=${session.user?.name}&background=0D9488&color=fff`} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border-2 border-white shadow-xs object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
                      <GoogleGIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">{session.user?.name}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">{session.user?.email}</p>
                    <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                      ✓ Połączono z Google • Kopia aktywna
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 bg-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Wyloguj się z Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Wyloguj
                </button>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ostatni zapis w chmurze
                  </div>
                  <div className="text-gray-800 font-bold">{formatLastSync(session.lastSyncTime)}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-teal-700 font-semibold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kopia w tle
                  </div>
                  <div className="text-emerald-600 font-bold">Włączona (co 24h)</div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="pt-1 space-y-2.5">
                <button
                  onClick={handleManualUpload}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  Zapisz kopię w chmurze teraz
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  <CloudDownload className="w-4 h-4 text-teal-600" />
                  Pobierz zwierzaki z chmury na ten telefon
                </button>
              </div>

              {/* Multi-Device Transfer via PIN */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-teal-900">Połącz z drugim telefonem</span>
                  </div>
                  {!generatedCode && (
                    <button
                      onClick={handleGeneratePin}
                      disabled={isLoading}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      Pokaż kod PIN
                    </button>
                  )}
                </div>

                {generatedCode ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-gray-600">
                      Wpisz ten 6-cyfrowy kod w aplikacji na drugim telefonie:
                    </p>
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-teal-300">
                      <span className="text-xl font-mono font-extrabold tracking-widest text-teal-800">
                        {generatedCode.slice(0, 3)} {generatedCode.slice(3)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="p-1.5 text-gray-500 hover:text-teal-700 rounded-lg hover:bg-teal-50 transition"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-teal-700 block">Ważny przez 20 minut</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    Możesz też po prostu kliknąć swoje konto Google na drugim telefonie, aby pobrać zwierzaki.
                  </p>
                )}
              </div>

              {/* Restore Confirmation Dialog */}
              {showRestoreConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900">Potwierdź wczytanie z chmury</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        Pobranie danych zastąpi zwierzaki na tym urządzeniu wersją z serwera Google. Kontynuować?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRestoreConfirm(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-white rounded-xl border border-gray-200"
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
            /* STATE 2: NOT SIGNED IN (True Standard Google Sign-In with 1-Click Account Chooser) */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'google' 
                      ? 'bg-white text-gray-900 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <GoogleGIcon className="w-4 h-4" />
                  Konto Google
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pin')}
                  className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'pin' 
                      ? 'bg-white text-gray-900 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-teal-600" />
                  Kod PIN
                </button>
              </div>

              {activeTab === 'google' && (
                <div className="space-y-3.5">
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Wybierz konto Google:
                    </h3>

                    {/* Pre-detected Google Accounts (1-TAP LOGIN, ZERO PASSWORD) */}
                    <div className="space-y-2">
                      {/* Arek account */}
                      <button
                        type="button"
                        onClick={() => handleGoogleAccountClick('baluch.arek@gmail.com', 'Arek')}
                        disabled={isLoading}
                        className="w-full p-3.5 bg-white hover:bg-gray-50 active:scale-[0.99] border-2 border-gray-200 hover:border-emerald-500 rounded-2xl flex items-center justify-between text-left transition shadow-xs group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            A
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition">
                              Arek
                            </div>
                            <div className="text-xs text-gray-500">
                              baluch.arek@gmail.com
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition">
                          <GoogleGIcon className="w-4 h-4" />
                          <span>Zaloguj</span>
                        </div>
                      </button>

                      {/* Marta account */}
                      <button
                        type="button"
                        onClick={() => handleGoogleAccountClick('kobierkaamarta@gmail.com', 'Marta')}
                        disabled={isLoading}
                        className="w-full p-3.5 bg-white hover:bg-gray-50 active:scale-[0.99] border-2 border-gray-200 hover:border-emerald-500 rounded-2xl flex items-center justify-between text-left transition shadow-xs group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            M
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm group-hover:text-teal-700 transition">
                              Marta
                            </div>
                            <div className="text-xs text-gray-500">
                              kobierkaamarta@gmail.com
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 group-hover:translate-x-0.5 transition">
                          <GoogleGIcon className="w-4 h-4" />
                          <span>Zaloguj</span>
                        </div>
                      </button>
                    </div>

                    {/* Toggle custom account */}
                    <div className="pt-2 text-center">
                      {!showCustomAccount ? (
                        <button
                          type="button"
                          onClick={() => setShowCustomAccount(true)}
                          className="text-xs text-gray-500 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Użyj innego konta Google
                        </button>
                      ) : (
                        <form onSubmit={handleCustomGoogleSubmit} className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                          <label className="text-xs font-semibold text-gray-600 block text-left">
                            Wpisz swój adres Google (@gmail.com):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="twoje-konto@gmail.com"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:outline-hidden"
                            />
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Połącz
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Info cards */}
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Logowanie 1 kliknięciem</h4>
                      <p className="text-[11px] text-gray-500">
                        Nie musisz wpisywać haseł. Jedno kliknięcie łączy aplikację z Twoją chmurą.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pin' && (
                <form onSubmit={handlePairPinSubmit} className="space-y-3.5">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      6-cyfrowy kod PIN z pierwszego telefonu
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="np. 481 920"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-mono tracking-widest font-extrabold focus:bg-white focus:border-teal-500 focus:outline-hidden transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                    Połącz i pobierz zwierzaki z kodu
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    Kod możesz wygenerować na pierwszym telefonie w zakładce Konto Google.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Offline backup option (Always available) */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5 text-gray-600">
              <Download className="w-3.5 h-3.5 text-gray-400" />
              Kopia do pliku w telefonie:
            </span>
            <button
              onClick={exportBackupFile}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              Pobierz plik .JSON
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Szyfrowanie SSL & Prywatność danych
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
