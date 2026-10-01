import React, { useState, useEffect } from 'react';
import { 
  BatteryCharging, 
  CheckCircle2, 
  AlertTriangle, 
  Settings, 
  ExternalLink, 
  ShieldCheck, 
  X, 
  Smartphone, 
  Clock, 
  BellRing,
  Info
} from 'lucide-react';
import { 
  checkBatteryOptimizationStatus, 
  requestIgnoreBatteryOptimization, 
  openAppSystemSettings, 
  BatteryStatus 
} from '../services/batteryOptimizationService';
import { Capacitor } from '@capacitor/core';

interface BatteryOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatteryOptimizationModal: React.FC<BatteryOptimizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<BatteryStatus>({
    isSupported: false,
    isIgnored: true,
    manufacturer: 'Android',
  });
  const [loading, setLoading] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkBatteryOptimizationStatus().then(setStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAndroid = Capacitor.getPlatform() === 'android';
  const mfg = (status.manufacturer || '').toLowerCase();
  const isXiaomi = mfg.includes('xiaomi') || mfg.includes('redmi') || mfg.includes('poco');
  const isSamsung = mfg.includes('samsung');
  const isHuawei = mfg.includes('huawei') || mfg.includes('honor');

  const handleRequestIgnore = async () => {
    setLoading(true);
    await requestIgnoreBatteryOptimization();
    setActionDone(true);
    setLoading(false);
    setTimeout(() => {
      checkBatteryOptimizationStatus().then(setStatus);
    }, 1500);
  };

  const handleOpenSettings = async () => {
    await openAppSystemSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center shadow-inner">
              <BatteryCharging className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight flex items-center gap-2">
                Niezawodne Przypomnienia w Tle
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Zabezpieczenie przed usypianiem alarmów o lekach
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 text-xs sm:text-sm">
          {/* Status banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            status.isIgnored 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {status.isIgnored ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-extrabold text-sm">
                {status.isIgnored 
                  ? 'Brak ograniczeń baterii (Zalecane)' 
                  : 'Wykryto aktywne ograniczenia oszczędzania baterii'}
              </div>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">
                {status.isIgnored
                  ? 'Aplikacja ma pełne prawo wybudzać powiadomienia o lekach i kleszczach dokładnie o wyznaczonej godzinie.'
                  : 'System Android może opóźniać lub blokować powiadomienia o lekach pupila, gdy telefon jest uśpiony przez dłuższy czas.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {isAndroid && !status.isIgnored && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRequestIgnore}
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
              >
                <BatteryCharging className="w-4 h-4" />
                <span>Wyłącz optymalizację baterii dla PetCare</span>
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Otwórz ustawienia systemowe aplikacji PetCare</span>
            </button>
          </div>

          {/* Manufacturer specific guide */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="font-extrabold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wide">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span>Wskazówki dla Twojego telefonu ({status.manufacturer || 'Android'}):</span>
            </div>

            {isXiaomi ? (
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">Autostart:</strong> Wejdź w Ustawienia ➔ Aplikacje ➔ Zarządzaj aplikacjami ➔ PetCare ➔ włącz <em>„Autostart”</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Oszczędzanie energii:</strong> W ustawieniach PetCare wybierz <em>„Oszczędzanie energii” ➔ „Bez ograniczeń”</em>.
                </li>
              </ul>
            ) : isSamsung ? (
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">Bateria:</strong> Wejdź w Ustawienia ➔ Aplikacje ➔ PetCare ➔ Bateria ➔ zaznacz <em>„Nieograniczone”</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Nigdy nie uśpiaj:</strong> W Ustawienia ➔ Pielęgnacja urządzenia ➔ Bateria ➔ Limity użycia w tle ➔ dodaj PetCare do <em>„Aplikacje, które nigdy nie będą uśpione”</em>.
                </li>
              </ul>
            ) : isHuawei ? (
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">Uruchamianie aplikacji:</strong> Wejdź w Ustawienia ➔ Bateria ➔ Uruchamianie aplikacji ➔ znajdź PetCare ➔ wyłącz <em>„Zarządzaj automatycznie”</em> i zaznacz wszystkie 3 przełączniki (Autostart, Uruchomienie pośrednie, Działanie w tle).
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">Użycie baterii przez aplikację:</strong> W Ustawieniach systemowych aplikacji wybierz Bateria ➔ <em>„Bez ograniczeń”</em>.
                </li>
                <li>
                  <strong className="text-slate-900">Alarmy i przypomnienia:</strong> Upewnij się, że opcja <em>„Zezwalaj na ustawianie alarmów i przypomnień”</em> jest włączona.
                </li>
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-xl text-teal-800 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600" />
            <span>PetCare nie zużywa baterii w tle. Budzi się na ułamek sekundy tylko wtedy, gdy przypada godzina podania leku.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
