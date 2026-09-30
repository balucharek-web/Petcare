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
  CheckCircle2,
  Sparkles,
  Download
} from 'lucide-react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  signInWithGoogle 
} from '../services/cloudSyncService';
import { googleSignIn as firebaseGoogleSignIn } from '../services/googleDriveSync';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGoogleEmailPrompt, setShowGoogleEmailPrompt] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

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
      if (mode === 'register') {
        await registerWithEmail(cleanEmail, password, name.trim());
      } else {
        await loginWithEmail(cleanEmail, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Wystąpił błąd logowania. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Try Firebase Google Sign In popup first
      try {
        const result = await firebaseGoogleSignIn();
        if (result?.user?.email) {
          await signInWithGoogle(
            result.user.email,
            result.user.displayName || undefined,
            result.user.photoURL || undefined
          );
          onLoginSuccess();
          return;
        }
      } catch (popupErr: any) {
        console.warn('Firebase popup was blocked or closed:', popupErr?.message);
        // Fallback to Google email direct input if popup is blocked in iframe/Capacitor
        setShowGoogleEmailPrompt(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Nie udało się połączyć z kontem Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = googleEmailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setErrorMsg('Wprowadź poprawny adres e-mail konta Google.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithGoogle(clean);
      setShowGoogleEmailPrompt(false);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Błąd autoryzacji konta Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-[36px] shadow-2xl p-6 sm:p-8 flex flex-col relative overflow-hidden backdrop-blur-xl">
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
              Chmura v2.18
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Książeczka zdrowia, historia leków i szczepień Twojego pupila. Zaloguj się, aby uzyskać bezpieczny dostęp do swoich danych.
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
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Direct Modal fallback */}
        {showGoogleEmailPrompt ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <GoogleGIcon className="w-4 h-4" />
                Połącz z kontem Google
              </span>
              <button
                onClick={() => setShowGoogleEmailPrompt(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Anuluj
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Wpisz adres e-mail konta Google, do którego mają być przypisane Twoje zwierzaki:
            </p>
            <form onSubmit={handleGoogleDirectSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="twoj.adres@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                {isLoading ? 'Łączenie...' : 'Zaloguj przez Google'}
              </button>
            </form>
          </div>
        ) : (
          /* Google Sign In Button */
          <div className="mb-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl text-xs shadow-md transition active:scale-98 cursor-pointer disabled:opacity-60"
            >
              <GoogleGIcon className="w-4 h-4 shrink-0" />
              <span>Kontynuuj przez Google</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 my-2 text-slate-500">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] font-bold uppercase tracking-wider">lub e-mail i hasło</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-2xl mb-4 border border-slate-700/60">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              mode === 'login'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Logowanie
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              mode === 'register'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Twoje imię lub pseudonim
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Anna"
                  className="w-full bg-slate-800/70 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
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
                className="w-full bg-slate-800/70 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Hasło {mode === 'register' && <span className="text-slate-500 text-[10px]">(min. 6 znaków)</span>}
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
                className="w-full bg-slate-800/70 border border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
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
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-teal-500/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Logowanie...' : 'Tworzenie konta...'}
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Zaloguj się do PetCare' : 'Zarejestruj i utwórz konto'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

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
    </div>
  );
};
