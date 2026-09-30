import React, { useState } from 'react';
import { LayoutGrid, X, Check, Smartphone, Sparkles, ExternalLink, ArrowRight, ShieldCheck, Heart, AlertCircle, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Pet } from '../types/pet';
import { pinPetCareWidgetToHomeScreen, syncWidgetWithLatestData } from '../services/nativeWidget';

interface HomeScreenWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePet?: Pet;
  pendingMedicationsCount: number;
}

export const HomeScreenWidgetModal: React.FC<HomeScreenWidgetModalProps> = ({
  isOpen,
  onClose,
  activePet,
  pendingMedicationsCount,
}) => {
  const [isPinning, setIsPinning] = useState(false);
  const [pinStatus, setPinStatus] = useState<'idle' | 'success' | 'manual_required' | 'web_mode'>('idle');
  const isAndroidNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';

  if (!isOpen) return null;

  const handlePin = async () => {
    setIsPinning(true);
    setPinStatus('idle');

    if (!isAndroidNative) {
      setPinStatus('web_mode');
      setIsPinning(false);
      return;
    }

    try {
      await syncWidgetWithLatestData();
      const res = await pinPetCareWidgetToHomeScreen();
      if (res.requested) {
        setPinStatus('success');
      } else {
        setPinStatus('manual_required');
      }
    } catch {
      setPinStatus('manual_required');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Widżet na pulpit telefonu</span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.5 rounded uppercase">Android</span>
              </h3>
              <p className="text-xs text-teal-100">Ekran początkowy bez konieczności otwierania aplikacji</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Status Banners */}
          {pinStatus === 'success' && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>System Android wyświetlił zapytanie o dodanie widżetu!</strong> Kliknij „Dodaj automatycznie” w oknie systemowym.
              </span>
            </div>
          )}

          {pinStatus === 'manual_required' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Twój launcher Androida wymaga ręcznego dodania widżetu.</strong>
                <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                  Przytrzymaj palec na wolnym miejscu na pulpicie telefonu ➔ wybierz <strong>„Widżety”</strong> ➔ przeciągnij <strong>„PetCare: Pupil i Leki”</strong>.
                </p>
              </div>
            </div>
          )}

          {pinStatus === 'web_mode' && (
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 rounded-2xl flex items-start gap-2.5 text-xs text-sky-900 dark:text-sky-200 animate-fadeIn">
              <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Jesteś w wersji webowej (przeglądarka / PWA).</strong>
                <p className="mt-0.5 text-[11px] text-sky-800 dark:text-sky-300">
                  Natywny widżet pulpitu 4x2 działa w <strong>aplikacji zainstalowanej z pliku APK na telefonie</strong>. W przeglądarce możesz skorzystać z opcji menu: <em>„Dodaj do ekranu głównego”</em>, aby zainstalować aplikację.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Live Mockup of the Home Screen Widget */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Tak widżet wygląda na pulpicie telefonu:
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Format 4x2</span>
            </div>

            {/* Widget Replica */}
            <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden select-none">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                      <span>PetCare</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-teal-400">{activePet?.name || 'Lucky'}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {activePet?.species === 'dog' ? 'Pies' : activePet?.species === 'cat' ? 'Kot' : 'Pupil'}
                      {activePet?.breed ? ` • ${activePet.breed}` : ''}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                  {pendingMedicationsCount > 0 ? `⚠️ ${pendingMedicationsCount} do podania` : '✓ Wszystko podane'}
                </span>
              </div>

              <div className="py-3 space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">PLAN NA DZIŚ &amp; LEKI:</span>
                <p className="text-xs font-bold text-slate-200">
                  {pendingMedicationsCount > 0 
                    ? `💊 Zaplanowane dawki leków na dziś (${pendingMedicationsCount} do podania)`
                    : 'Wszystkie dawki leków na dziś podane ✓'}
                </p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 inline" />
                  <span>Kleszcze: aktywna ochrona • Profilaktyka aktualna</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <span className="text-[10px] font-bold text-teal-400 flex items-center gap-1">
                  Dotknij, aby otworzyć PetCare <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action: Pin Widget Programmatically */}
          <button
            onClick={handlePin}
            disabled={isPinning}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer text-sm"
          >
            <Smartphone className="w-5 h-5 text-teal-100" />
            <span>{isPinning ? 'Wysyłanie do pulpitu...' : 'Dodaj widżet do ekranu głównego (Pulpitu)'}</span>
          </button>

          {/* Manual Instructions for Android Launchers */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 flex items-center justify-center text-[11px] font-black">?</span>
              Jak dodać widżet ręcznie na dowolnym telefonie z Androidem:
            </h5>
            <ol className="space-y-1.5 pl-6 list-decimal leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
              <li>Wyjdź na <strong>pulpit telefonu (ekran startowy)</strong>.</li>
              <li><strong>Przytrzymaj palec</strong> na pustym miejscu na ekranie przez 1 sekundę.</li>
              <li>Z dolnego menu wybierz opcję <strong>„Widżety” (Widgets)</strong>.</li>
              <li>Przewiń do aplikacji <strong>PetCare</strong>.</li>
              <li>Przytrzymaj kafelek <strong>PetCare: Pupil i Leki</strong> i przeciągnij go w wybrane miejsce na pulpicie!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
