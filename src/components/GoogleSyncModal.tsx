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
  Sparkles,
  KeyRound,
  Download,
  Share2,
  Lock,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { 
  getStoredSession,
  subscribeToCloudSync,
  loginWithCloud,
  signOutCloud,
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

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [session, setSession] = useState<CloudSession>(getStoredSession());
  const [activeTab, setActiveTab] = useState<'account' | 'code' | 'file'>('account');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) {
      setFeedback({ type: 'error', message: 'Wpisz swój adres e-mail (np. konto Google @gmail.com).' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await loginWithCloud(emailInput, passwordInput);
      setFeedback({
        type: 'success',
        message: `Zalogowano pomyślnie jako ${res.user.name || res.user.email}! Możesz teraz przesyłać i pobierać dane w chmurze.`
      });
      // Automatically upload if local data exists
      try {
        await uploadToCloud();
      } catch {}
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd logowania. Sprawdź wprowadzone dane.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOutCloud();
    setGeneratedCode(null);
    setFeedback({
      type: 'info',
      message: 'Wylogowano z chmury PetCare.'
    });
  };

  const handleUpload = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await uploadToCloud();
      setFeedback({
        type: 'success',
        message: `Pomyślnie zsynchronizowano! Zapisano ${res.petCount} zwierzaków w bezpiecznej chmurze.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się zapisać danych w chmurze.'
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
      const res = await downloadFromCloud();
      setFeedback({
        type: 'success',
        message: `Pobrano dane pomyślnie! Przywrócono ${res.petCount} zwierzaków wraz z całą historią medyczną.`
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

  const handleGenerateCode = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await generateQuickPairCode();
      setGeneratedCode(res.code);
      setCodeExpiresAt(res.expiresAt);
      setFeedback({
        type: 'success',
        message: 'Wygenerowano 6-cyfrowy kod parowania. Wpisz go na drugim telefonie w ciągu 15 minut.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się wygenerować kodu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairWithCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!codeInput || codeInput.replace(/\D/g, '').length < 6) {
      setFeedback({ type: 'error', message: 'Wpisz pełny 6-cyfrowy kod parowania.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await pairWithQuickCode(codeInput);
      setFeedback({
        type: 'success',
        message: `Połączono pomyślnie! Przywrócono ${res.petCount} zwierzaków opiekuna ${res.user.email}.`
      });
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Kod jest nieprawidłowy lub wygasł.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Synchronizacja w Chmurze</h2>
              <p className="text-xs text-emerald-100">Kopia zapasowa i dostęp na wielu telefonach</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback Banner */}
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
              {feedback.type === 'info' && <Cloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1 font-medium">{feedback.message}</div>
            </div>
          )}

          {/* User state: SIGNED IN */}
          {isSignedIn ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
                    {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{session.user?.name || 'Opiekun PetCare'}</h3>
                    <p className="text-xs text-gray-600 font-medium">{session.user?.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-semibold text-emerald-700">Aktywna synchronizacja</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 bg-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Wyloguj się"
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
                    <RefreshCw className="w-3.5 h-3.5" />
                    Synchronizacja w tle
                  </div>
                  <div className="text-emerald-600 font-bold">Włączona (co 24h)</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  Wyślij dane do chmury (Zapisz kopię)
                </button>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  <CloudDownload className="w-4 h-4 text-teal-600" />
                  Pobierz dane z chmury (Wczytaj na to urządzenie)
                </button>
              </div>

              {/* Multi-Device Pairing Section */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-teal-900">Połącz drugi telefon / tablet</span>
                  </div>
                  {!generatedCode && (
                    <button
                      onClick={handleGenerateCode}
                      disabled={isLoading}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      Pokaż kod PIN
                    </button>
                  )}
                </div>

                {generatedCode ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-600">
                      Wpisz poniższy 6-cyfrowy kod w aplikacji na drugim urządzeniu, aby natychmiast pobrać zwierzaki:
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
                        title="Skopiuj kod"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-teal-700 block">Ważny przez 15 minut</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    Możesz zalogować się tym samym adresem e-mail na drugim telefonie lub wygenerować krótki kod parowania.
                  </p>
                )}
              </div>

              {/* Confirm download overwrite */}
              {showRestoreConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900">Potwierdź pobranie danych</h4>
                      <p className="text-xs text-amber-800 mt-1">
                        Pobranie kopii z chmury zastąpi listę zwierzaków na tym urządzeniu wersją z serwera. Czy chcesz kontynuować?
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
                      onClick={handleDownloadConfirm}
                      className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                    >
                      Tak, wczytaj dane
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* User state: NOT SIGNED IN (Clean standard mobile app login tabs) */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className={`py-2 px-3 rounded-xl transition ${
                    activeTab === 'account' 
                      ? 'bg-white text-emerald-800 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Konto Google / E-mail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`py-2 px-3 rounded-xl transition ${
                    activeTab === 'code' 
                      ? 'bg-white text-emerald-800 shadow-xs' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Kod parowania (PIN)
                </button>
              </div>

              {activeTab === 'account' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      Twój adres e-mail (np. Google @gmail.com)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="twoj-adres@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-hidden transition"
                    />
                  </div>

                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        Hasło lub PIN zabezpieczający
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">opcjonalne</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Wpisz hasło lub 4-cyfrowy PIN"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-hidden transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    )}
                    <span>Zaloguj się i połącz z chmurą</span>
                  </button>

                  <p className="text-[11px] text-gray-400 text-center">
                    Pierwsze logowanie automatycznie rejestruje konto i tworzy bezpieczną kopię zwierzaków.
                  </p>
                </form>
              )}

              {activeTab === 'code' && (
                <form onSubmit={handlePairWithCode} className="space-y-3.5">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      6-cyfrowy kod z pierwszego telefonu
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="np. 481 920"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
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
                    Kod możesz wygenerować na swoim pierwszym telefonie w zakładce Synchronizacja.
                  </p>
                </form>
              )}

              {/* Benefits list */}
              <div className="pt-2 grid grid-cols-1 gap-2 text-left">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Synchronizacja między telefonami</h4>
                    <p className="text-[11px] text-gray-500">Zaloguj się na drugim telefonie, aby mieć tę samą apteczkę i badania.</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Automatyczny zapis w tle raz na 24h</h4>
                    <p className="text-[11px] text-gray-500">Bezpieczna kopia odświeża się bez przerywania korzystania z aplikacji.</p>
                  </div>
                </div>
              </div>
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
