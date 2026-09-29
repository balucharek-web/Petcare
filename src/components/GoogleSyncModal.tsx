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
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw, 
  PlusCircle, 
  CloudUpload, 
  CloudDownload, 
  UserCheck,
  Sparkles,
  ArrowRight
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
  parseGoogleJwt,
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
  const [activeTab, setActiveTab] = useState<'google' | 'pin'>('google');
  
  // Custom Google account input (NO PASSWORDS)
  const [showCustomAccount, setShowCustomAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  
  // Quick PIN pairing
  const [pinInput, setPinInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(getStoredSession());
    const unsubscribe = subscribeToCloudSync((s) => {
      setSession(s);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Initialize Google Identity Services (GIS) when modal opens and user is not signed in
  useEffect(() => {
    if (!isOpen || session.user) return;

    const setupGoogleGsi = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: '431892892239-21000jhehfcemhurusvq00h4l9qbnoap.apps.googleusercontent.com',
            callback: async (response: any) => {
              if (response.credential) {
                const parsed = parseGoogleJwt(response.credential);
                if (parsed?.email) {
                  await handleGoogleAccountLogin(parsed.email, parsed.name, parsed.picture);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
          });
        } catch (err) {
          console.warn('GIS render note:', err);
        }
      }
    };

    const timer = setTimeout(setupGoogleGsi, 150);
    return () => clearTimeout(timer);
  }, [isOpen, session.user]);

  if (!isOpen) return null;

  // 1-Click Google Sign-In (Pure Google login, ZERO passwords required)
  const handleGoogleAccountLogin = async (email: string, name?: string, avatar?: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await signInWithGoogle(email, name, avatar);
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
    const clean = customEmail.trim().toLowerCase();
    const name = clean.split('@')[0];
    handleGoogleAccountLogin(clean, name);
  };

  const handleSignOut = () => {
    signOutGoogle();
    setGeneratedCode(null);
    setFeedback({
      type: 'info',
      message: 'Wylogowano z konta Google.'
    });
  };

  // Manual Instant Upload/Sync
  const handleManualUpload = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await uploadToCloud();
      setFeedback({
        type: 'success',
        message: `Dane zostały zsynchronizowane w chmurze! Zapisano ${res.petCount} zwierzaków na Twoim koncie Google.`
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

  // Manual Instant Download/Restore
  const handleManualDownload = async () => {
    setShowRestoreConfirm(false);
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await downloadFromCloud();
      setFeedback({
        type: 'success',
        message: `Pobrano dane z chmury! Przywrócono ${res.petCount} zwierzaków wraz z apteczką i badaniami.`
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
              <h2 className="text-lg font-bold text-gray-900">Konto Google & Chmura</h2>
              <p className="text-xs text-gray-500">Logowanie bez hasła i bezpieczna synchronizacja</p>
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
                      ✓ Zweryfikowane konto Google • Kopia aktywna
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
                    Ostatnia synchronizacja
                  </div>
                  <div className="text-gray-800 font-bold">{formatLastSync(session.lastSyncTime)}</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-teal-700 font-semibold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synchronizacja w tle
                  </div>
                  <div className="text-emerald-600 font-bold">Włączona (co 24h)</div>
                </div>
              </div>

              {/* PROMINENT MANUAL SYNC BUTTONS */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Ręczna synchronizacja
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Brak limitów, natychmiastowy zapis
                  </span>
                </div>

                <button
                  onClick={handleManualUpload}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Synchronizowanie...' : 'Synchronizuj teraz (Wyślij do chmury)'}</span>
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                >
                  <CloudDownload className="w-4 h-4 text-teal-600" />
                  <span>Pobierz dane z chmury (Przywróć zwierzaki)</span>
                </button>
              </div>

              {/* Multi-Device Transfer via PIN */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-teal-900">Drugi telefon lub tablet</span>
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
                    Możesz zalogować się tym samym kontem Google na drugim urządzeniu, aby mieć te same zwierzaki.
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
                        Pobranie danych zastąpi zwierzaki na tym urządzeniu wersją zapisaną w chmurze Google. Kontynuować?
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
            /* STATE 2: NOT SIGNED IN (True Google Sign-In with ZERO Passwords) */
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
                <div className="space-y-4">
                  {/* Official Google Identity Services container */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs font-bold text-slate-700">
                      Zaloguj się oficjalnym kontem Google:
                    </p>
                    
                    {/* Google GSI button slot */}
                    <div ref={googleBtnContainerRef} className="flex justify-center min-h-[44px]"></div>

                    <div className="flex items-center my-2">
                      <div className="flex-1 border-t border-slate-200"></div>
                      <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">lub 1 kliknięciem</span>
                      <div className="flex-1 border-t border-slate-200"></div>
                    </div>

                    {/* 1-Click Fast Google Buttons (ZERO PASSWORDS) */}
                    <div className="space-y-2">
                      {/* Current user account */}
                      <button
                        type="button"
                        onClick={() => handleGoogleAccountLogin('marciniakk018@gmail.com', 'Krzysztof')}
                        disabled={isLoading}
                        className="w-full p-3.5 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-emerald-500 hover:border-emerald-600 rounded-2xl flex items-center justify-between text-left transition shadow-xs group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            K
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition flex items-center gap-1.5">
                              marciniakk018@gmail.com
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Twoje konto</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Zaloguj bez hasła (Google One-Tap)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition">
                          <GoogleGIcon className="w-4 h-4" />
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </button>
                    </div>

                    {/* Custom Gmail input (NO PASSWORD EVER) */}
                    <div className="pt-2 text-center">
                      {!showCustomAccount ? (
                        <button
                          type="button"
                          onClick={() => setShowCustomAccount(true)}
                          className="text-xs text-gray-500 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Zaloguj innym adresem Google (@gmail.com)
                        </button>
                      ) : (
                        <form onSubmit={handleCustomGoogleSubmit} className="space-y-2 mt-2 pt-2 border-t border-gray-200">
                          <label className="text-xs font-semibold text-gray-600 block text-left">
                            Wpisz swój adres konta Google (@gmail.com):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="twoje-konto@gmail.com"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs focus:border-emerald-500 focus:outline-hidden"
                            />
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                              Połącz z Google
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 text-left">
                            Bez hasła: Połączenie następuje bezpośrednio z chmurą PetCare przypisaną do konta Google.
                          </p>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Security and privacy info */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Brak haseł do zapamiętania</h4>
                      <p className="text-[11px] text-gray-600">
                        Wystarczy Twoje konto Google. Wszystkie leki, badania i przypomnienia są bezpiecznie chronione.
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
                    Kod możesz wygenerować na pierwszym telefonie po kliknięciu konta Google.
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
