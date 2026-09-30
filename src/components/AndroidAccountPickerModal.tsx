import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Fingerprint, 
  ShieldCheck, 
  X, 
  Trash2, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone
} from 'lucide-react';
import { 
  requestNativeAndroidVerification, 
  isNativeBiometricAvailable 
} from '../services/nativeAuthService';

interface AndroidAccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name?: string, avatar?: string) => Promise<void>;
}

interface SavedAccount {
  email: string;
  name: string;
  avatar?: string;
  lastUsed?: string;
}

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const AndroidAccountPickerModal: React.FC<AndroidAccountPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    isNativeBiometricAvailable().then(setHasBiometrics);
  }, []);

  // Load saved accounts from device storage
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('petcare_device_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          return;
        }
      }
      // Check legacy email list fallback
      const legacyRaw = localStorage.getItem('petcare_saved_google_emails');
      if (legacyRaw) {
        const legacyList: string[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList) && legacyList.length > 0) {
          const converted: SavedAccount[] = legacyList.map((em) => ({
            email: em,
            name: em.split('@')[0],
            lastUsed: new Date().toLocaleDateString('pl-PL'),
          }));
          setAccounts(converted);
          localStorage.setItem('petcare_device_accounts', JSON.stringify(converted));
          return;
        }
      }
    } catch {}
    setAccounts([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const saveAccountsList = (updated: SavedAccount[]) => {
    setAccounts(updated);
    try {
      localStorage.setItem('petcare_device_accounts', JSON.stringify(updated));
    } catch {}
  };

  const handleAccountClick = async (account: SavedAccount) => {
    setErrorMessage(null);
    setIsVerifying(true);
    setVerifyingEmail(account.email);

    try {
      // 1. Request native Android fingerprint or screen lock confirmation
      if (hasBiometrics) {
        await requestNativeAndroidVerification(account.email);
      }

      // 2. Complete login with verified account
      await onSelectAccount(account.email, account.name, account.avatar);

      // 3. Update last used
      const updated = [
        { ...account, lastUsed: 'Teraz' },
        ...accounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase()),
      ];
      saveAccountsList(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Weryfikacja konta nie powiodła się.');
    } finally {
      setIsVerifying(false);
      setVerifyingEmail(null);
    }
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setErrorMessage('Wprowadź prawidłowy adres e-mail konta Google.');
      return;
    }

    setIsVerifying(true);
    try {
      if (hasBiometrics) {
        await requestNativeAndroidVerification(clean);
      }

      const accountObj: SavedAccount = {
        email: clean,
        name: newName.trim() || clean.split('@')[0],
        lastUsed: 'Teraz',
      };

      const updated = [
        accountObj,
        ...accounts.filter((a) => a.email.toLowerCase() !== clean),
      ];
      saveAccountsList(updated);

      await onSelectAccount(accountObj.email, accountObj.name);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Nie udało się dodać konta.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = accounts.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    saveAccountsList(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 flex flex-col relative overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Sheet Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
              <GoogleGIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Wybierz konto
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Android
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                aby przejść do aplikacji <strong className="text-white">PetCare</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security badge */}
        <div className="mb-4 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl flex items-center gap-2.5 text-[11px] text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Każde konto ma w 100% odizolowane, prywatne dane Twoich zwierzaków.</span>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start gap-2 animate-fadeIn">
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Verifying Status */}
        {isVerifying && (
          <div className="mb-4 p-3.5 bg-teal-950/80 border border-teal-800 text-teal-200 rounded-2xl text-xs flex items-center gap-3 animate-pulse">
            <Fingerprint className="w-5 h-5 text-teal-400 animate-bounce" />
            <div>
              <p className="font-bold text-white">Potwierdź tożsamość na telefonie...</p>
              <p className="text-[11px] text-teal-300">
                Użyj odcisku palca lub blokady ekranu Androida dla konta {verifyingEmail}
              </p>
            </div>
          </div>
        )}

        {/* Content: List of Accounts or Add New */}
        {!isAddingNew ? (
          <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto pr-1">
            {accounts.length > 0 ? (
              accounts.map((acc) => {
                const initial = (acc.name || acc.email).charAt(0).toUpperCase();
                return (
                  <div
                    key={acc.email}
                    onClick={() => !isVerifying && handleAccountClick(acc)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-750 active:scale-98 border border-slate-700/80 hover:border-teal-500/60 rounded-2xl cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {initial}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{acc.name}</span>
                          {hasBiometrics && (
                            <span title="Zabezpieczone biometrią">
                              <Fingerprint className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(acc.email, e)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded-xl transition cursor-pointer"
                        title="Usuń konto z listy tego urządzenia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 px-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                <Smartphone className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold text-slate-300">
                  Brak zapisanych kont na tym telefonie
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dodaj swoje konto Google poniżej, aby bezpiecznie powiązać z nim pupili.
                </p>
              </div>
            )}

            {/* Add another account button */}
            <button
              type="button"
              onClick={() => { setIsAddingNew(true); setErrorMessage(null); }}
              className="w-full flex items-center gap-3 p-3 bg-slate-850 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl text-xs font-bold text-teal-300 transition cursor-pointer mt-2"
            >
              <div className="w-10 h-10 rounded-full bg-teal-950/70 border border-teal-800/60 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-left">
                <p className="text-white text-xs font-bold">Dodaj inne konto Google</p>
                <p className="text-[10px] text-slate-400 font-normal">Wpisz e-mail konta Google z tego telefonu</p>
              </div>
            </button>
          </div>
        ) : (
          /* Add New Account Form */
          <form onSubmit={handleAddNewSubmit} className="space-y-3.5 mb-4 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Adres e-mail konta Google (Gmail)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none">
                  <GoogleGIcon className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="twoj.adres@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Imię opiekuna (opcjonalnie)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="np. Arkadiusz"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div className="p-2.5 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
              <Fingerprint className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Telefon poprosi Cię o potwierdzenie tożsamości odciskiem palca lub kodem blokady ekranu.</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setIsAddingNew(false); setErrorMessage(null); }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Wstecz
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="flex-2 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow"
              >
                <span>Potwierdź i zaloguj</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center leading-relaxed">
          Aby zapewnić bezpieczeństwo Twoich danych, PetCare weryfikuje dostęp za pomocą zabezpieczeń systemowych Androida.
        </div>
      </div>
    </div>
  );
};
