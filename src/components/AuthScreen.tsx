import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone, 
  AlertCircle,
  Download,
  QrCode,
  Camera,
  Cloud,
  Sparkles
} from 'lucide-react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  signInWithGoogle,
  ensureGuestSession
} from '../services/cloudSyncService';
import { performSecureGoogleSignIn } from '../services/nativeGoogleAuth';
import { QRTransferModal } from './QRTransferModal';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');

  // Email / Password inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQRTransferOpen, setIsQRTransferOpen] = useState(false);

  // Commercial-Grade Google OAuth / OIDC Sign-In Trigger
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Authenticates with Google (Official Android SDK or Web Firebase Popup)
      const account = await performSecureGoogleSignIn();
      if (account && account.email && account.idToken) {
        await signInWithGoogle(account.email, account.idToken, account.name, account.photoUrl);
        onLoginSuccess();
        return;
      }
      throw new Error('Nie udało się uzyskać bezpiecznego tokenu Google.');
    } catch (err: any) {
      console.warn('Google Auth Error:', err);
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.message?.includes('Anulowano')
      ) {
        setErrorMsg('Logowanie przez Google zostało przerwane.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Błąd połączenia z serwerami Google. Sprawdź połączenie z internetem.');
      } else {
        setErrorMsg(err.message || 'Wystąpił błąd podczas autoryzacji kontem Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Wprowadź prawidłowy adres e-mail.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Hasło musi zawierać co najmniej 6 znaków.');
      return;
    }

    setIsLoading(true);
    try {
      if (emailMode === 'register') {
        await registerWithEmail(cleanEmail, password, name.trim());
      } else {
        await loginWithEmail(cleanEmail, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Wystąpił błąd logowania. Sprawdź hasło lub utwórz nowe konto.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-[36px] shadow-2xl p-6 sm:p-8 flex flex-col relative overflow-hidden backdrop-blur-xl">
        {/* Glow decorations */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6 relative">
          <div className="w-20 h-20 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-teal-500/25 text-4xl">
            🐾
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            PetCare
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Android v2.29
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Książeczka zdrowia, historia leków i szczepień Twojego pupila. Zaloguj się, aby uzyskać dostęp do swoich danych.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-800/60 rounded-full text-[11px] text-emerald-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prywatne, bezpieczne dane każdego opiekuna</span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* 1. INSTANT MULTI-DEVICE TRANSFER VIA QR CODE (PHONE TO PHONE) */}
        <div className="mb-4 p-3.5 bg-gradient-to-br from-teal-950/90 via-slate-900 to-emerald-950/90 border border-teal-700/60 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-xs font-black text-white">
                Masz PetCare na innym telefonie?
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
              Aparat QR
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-3 leading-snug">
            Zeskanuj aparatem kod QR ze starego telefonu — skopiujesz 100% zwierzaków, leków i badań bez wpisywania haseł!
          </p>
          <button
            type="button"
            onClick={() => setIsQRTransferOpen(true)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-teal-950/40 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Skanuj Kod QR z pierwszego telefonu</span>
          </button>
        </div>

        {/* 2. REINSTALLATION & CLOUD RESTORE INFO */}
        <div className="mb-4 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-2.5">
          <Cloud className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-snug">
            <strong className="text-white block font-bold">Miałeś aplikację i instalujesz ją ponownie?</strong>
            Zaloguj się poniżej swoim kontem Google lub e-mailem — PetCare automatycznie wykryje Twoją kopię z chmury i przywróci wszystkie dane.
          </div>
        </div>

        {/* 3. COMMERCIAL GOOGLE OAUTH / OIDC SIGN-IN */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:scale-98 text-slate-900 font-extrabold rounded-2xl text-sm shadow-xl transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-xs text-slate-700">
                <span className="w-4 h-4 border-2 border-slate-400 border-t-teal-600 rounded-full animate-spin" />
                Autoryzacja konta Google...
              </span>
            ) : (
              <>
                <GoogleGIcon className="w-5 h-5 shrink-0" />
                <span>Zaloguj się przez Google</span>
              </>
            )}
          </button>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Bezpieczne logowanie OAuth 2.0 / OpenID Connect</span>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 my-2 text-slate-500 mb-5">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-bold uppercase tracking-wider">lub e-mail i hasło</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* 2. EMAIL + PASSWORD SECTION */}
        <div className="space-y-4">
          {/* Sub-mode Tabs: Login vs Register */}
          <div className="grid grid-cols-2 p-1 bg-slate-800/60 rounded-xl border border-slate-700/40">
            <button
              type="button"
              onClick={() => { setEmailMode('login'); setErrorMsg(null); }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                emailMode === 'login'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mam już konto
            </button>
            <button
              type="button"
              onClick={() => { setEmailMode('register'); setErrorMsg(null); }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                emailMode === 'register'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nowe konto
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {emailMode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Twoje imię lub nazwa
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Anna"
                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Adres e-mail
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj.email@przyklad.pl"
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Hasło {emailMode === 'register' && <span className="text-slate-500 text-[10px]">(min. 6 znaków)</span>}
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-teal-500/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {emailMode === 'login' ? 'Logowanie...' : 'Tworzenie konta...'}
                </span>
              ) : (
                <>
                  <span>{emailMode === 'login' ? 'Zaloguj się do PetCare' : 'Zarejestruj i utwórz konto'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer download APK */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col items-center gap-2 text-center">
          <a
            href="/PetCare.apk"
            download="PetCare.apk"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-[11px] font-bold transition border border-slate-700/60 shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-400" />
            <span>Pobierz aplikację na Androida (.APK)</span>
            <Download className="w-3 h-3 text-teal-400" />
          </a>
          <span className="text-[10px] text-slate-500">
            Dostęp offline oraz automatyczna synchronizacja po zalogowaniu.
          </span>
        </div>
      </div>

      {isQRTransferOpen && (
        <QRTransferModal
          isOpen={isQRTransferOpen}
          initialMode="receive"
          onClose={() => setIsQRTransferOpen(false)}
          onDataRestored={() => {
            ensureGuestSession('Opiekun (Transfer QR)');
            setIsQRTransferOpen(false);
            onLoginSuccess();
          }}
        />
      )}
    </div>
  );
};
