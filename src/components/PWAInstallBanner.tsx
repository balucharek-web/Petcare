import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, CheckCircle, Info, ExternalLink, Copy, Check, MoreVertical, FolderDown } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('petcare_pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const handleOpenGuide = () => {
      setShowGuide(true);
    };

    window.addEventListener('pwa-open-install-guide', handleOpenGuide);
    return () => {
      window.removeEventListener('pwa-open-install-guide', handleOpenGuide);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('petcare_pwa_banner_dismissed', 'true');
    } catch {}
  };

  // If already running in standalone mode (already installed) or dismissed, and no guide modal requested
  if ((isInstalled || isDismissed) && !showGuide) {
    return null;
  }

  const directUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleInstallClick = async () => {
    if (isInIframe) {
      setShowGuide(true);
      return;
    }

    const accepted = await install();
    if (accepted) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    } else if (!isInstallable) {
      setShowGuide(true);
    }
  };

  const handleCopyLink = () => {
    if (directUrl) {
      navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {!isInstalled && !isDismissed && (
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm select-none border-b border-teal-600/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
              <Smartphone className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="truncate">
              <p className="font-bold text-white text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>Zainstaluj PetCare na telefonie</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/40 font-bold uppercase tracking-wider text-emerald-100">
                  PWA
                </span>
              </p>
              <p className="text-[11px] text-teal-100 truncate">Własna ikona • Pełny ekran • Działa offline</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Main Action Button */}
            {isInIframe ? (
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-teal-800 font-extrabold text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-700" />
                <span>Otwórz w Chrome</span>
              </a>
            ) : (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-teal-800 font-extrabold text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Zainstaluj aplikację</span>
              </button>
            )}

            {/* Guide / Info Button */}
            <button
              onClick={() => setShowGuide(true)}
              className="p-1.5 text-teal-100 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Instrukcja instalacji"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1 text-teal-200 hover:text-white transition rounded-lg hover:bg-white/10"
              title="Ukryj"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {installSuccess && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          Aplikacja PetCare została pomyślnie zainstalowana na Twoim telefonie!
        </div>
      )}

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-teal-600" />
                Instalacja PetCare na smartfonie
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              PetCare instaluje się jako aplikacja <strong>PWA (Progressive Web App)</strong>. 
              Ma własną ikonę w menu telefonu, uruchamia się bez paska adresu Chrome i działa offline.
            </p>

            {/* Direct Link Section if in Iframe */}
            {isInIframe && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  Jesteś w oknie podglądu czatu:
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Android ze względów bezpieczeństwa blokuje instalowanie aplikacji z wnętrza ramki czatu.
                  Otwórz aplikację w osobnej karcie przeglądarki Chrome:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-center font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Otwórz w nowej karcie Chrome
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-3 bg-white border border-amber-300 text-amber-800 rounded-xl font-semibold text-xs flex items-center gap-1 hover:bg-amber-100/50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Android Chrome Instructions */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-900 text-xs block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Instalacja w Google Chrome na Androidzie (WebAPK):
              </span>
              <ol className="space-y-2 text-slate-700 text-xs">
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 text-xs">1</span>
                  <span>Otwórz adres w aplikacji <strong>Google Chrome</strong> na telefonie.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 text-xs">2</span>
                  <div>
                    <span>Dotknij <strong>Menu Chrome</strong> (ikona </span>
                    <MoreVertical className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />
                    <span><strong>3 pionowe kropki</strong> w prawym górnym rogu przeglądarki).</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 text-xs">3</span>
                  <span>Wybierz opcję <strong>„Zainstaluj aplikację”</strong> – Android sam utworzy natywną aplikację w telefonie z ikoną i trybem offline.</span>
                </li>
              </ol>
            </div>

            {/* APK Generator & GitHub Actions Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  Chcesz fizyczny plik .APK?
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  GitHub & Online
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Możesz pobrać plik instalacyjny <strong>.apk</strong> na dwa sposoby:
              </p>
              
              <a
                href="/PetCare.apk"
                download="PetCare.apk"
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <Download className="w-4 h-4 text-emerald-100" />
                <span>Pobierz gotowy plik PetCare.apk</span>
              </a>

              {/* GitHub Actions */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="font-semibold text-slate-800 text-[11px] flex items-center justify-between">
                  <span>🐱 <strong>Przez GitHub Actions</strong> (Automatycznie)</span>
                  <span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-bold">Zalecane</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  W projekcie przygotowaliśmy już gotowy plik automatyzacji (<code>.github/workflows/build-apk.yml</code>). Pobierz paczkę ZIP z kodem i wgraj do swojego repozytorium GitHub:
                </p>
                <a
                  href="/petcare-project.zip"
                  download="petcare-project.zip"
                  className="w-full py-1.5 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <FolderDown className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pobierz paczkę kodu (.ZIP do wgrania na GitHub)</span>
                </a>
              </div>

              {/* PWABuilder */}
              <a
                href={`https://www.pwabuilder.com?url=${encodeURIComponent(directUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generuj plik APK na PWABuilder.com</span>
              </a>
            </div>

            {/* iOS Safari */}
            {isIOS && (
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 text-xs block">
                  Dla iPhone (Safari):
                </span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  1. Dotknij ikony <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> <strong>Udostępnij</strong> w dolnym pasku Safari.<br />
                  2. Przewiń w dół i wybierz <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-600" /> <strong>„Do ekranu początkowego”</strong>.<br />
                  3. Kliknij <strong>„Dodaj”</strong> w prawym górnym rogu.
                </p>
              </div>
            )}

            {!isInIframe && (
              <button
                onClick={() => {
                  setShowGuide(false);
                  handleInstallClick();
                }}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition active:scale-98 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Spróbuj zainstalować teraz
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
