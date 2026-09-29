import React, { useState } from 'react';
import { 
  Sliders, 
  Check, 
  RotateCcw, 
  X, 
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Beef,
  Scale,
  ShieldAlert,
  Wallet,
  HeartHandshake,
  Camera,
  BookOpen,
  Info,
  Phone
} from 'lucide-react';
import { DashboardConfig, DashboardWidgetKey, DEFAULT_DASHBOARD_CONFIG } from '../types/pet';
import { storage } from '../services/storage';

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  onSaveConfig: (newConfig: DashboardConfig) => void;
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<DashboardConfig>({ ...config });

  if (!isOpen) return null;

  const widgetDefinitions: { key: DashboardWidgetKey; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      key: 'shortcuts',
      label: 'Szybkie skróty',
      desc: 'Dzisiejsze leki i terminy szczepień na samej górze',
      icon: Sparkles,
    },
    {
      key: 'nutritionCalculator',
      label: 'Kalkulator Żywienia (RER / MER)',
      desc: 'Dzienne zapotrzebowanie kaloryczne i gramatura karmy',
      icon: Beef,
    },
    {
      key: 'weightTracker',
      label: 'Kontrola i wykres wagi',
      desc: 'Historia pomiarów masy ciała i trend',
      icon: Scale,
    },
    {
      key: 'toxicChecker',
      label: 'Czy może to zjeść? (Baza Toksyczności)',
      desc: 'Szybka wyszukiwarka bezpiecznego i trującego jedzenia',
      icon: ShieldAlert,
    },
    {
      key: 'expensesWidget',
      label: 'Wydatki i budżet zwierzaka',
      desc: 'Podsumowanie kosztów leczenia, karmy i wizyt',
      icon: Wallet,
    },
    {
      key: 'petsitterCard',
      label: 'Karta Petsittera / Harmonogram',
      desc: 'Szybki podgląd godzin karmienia, leków i zasad',
      icon: HeartHandshake,
    },
    {
      key: 'aiScanner',
      label: 'Skaner Medyczny AI',
      desc: 'Szybki przycisk aparatu do odczytu recept i badań',
      icon: Camera,
    },
    {
      key: 'chipAndDocs',
      label: 'Mikroczip i Dokumenty',
      desc: '15-cyfrowy numer chipa z kodem kreskowym i paszportem',
      icon: ShieldCheck,
    },
    {
      key: 'bookletScans',
      label: 'Skany książeczki zdrowia',
      desc: 'Galeria zdjęć fizycznej książeczki weterynaryjnej',
      icon: BookOpen,
    },
    {
      key: 'healthAlerts',
      label: 'Alergie i ostrzeżenia zdrowotne',
      desc: 'Widoczne informacje o nietolerancjach i uwagach',
      icon: Info,
    },
    {
      key: 'vetContact',
      label: 'Twój weterynarz & dyżur 24h',
      desc: 'Bezpośrednie numery do gabinetu i kliniki',
      icon: Phone,
    },
  ];

  const handleToggle = (key: DashboardWidgetKey) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEnableAll = () => {
    const allEnabled: DashboardConfig = {} as any;
    widgetDefinitions.forEach(w => {
      allEnabled[w.key] = true;
    });
    setLocalConfig(allEnabled);
  };

  const handleResetDefaults = () => {
    setLocalConfig({ ...DEFAULT_DASHBOARD_CONFIG });
  };

  const handleSave = () => {
    storage.saveDashboardConfig(localConfig);
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Dostosuj Stronę Główną
              </h2>
              <p className="text-xs text-teal-200/80">Wybierz, które moduły chcesz widzieć na pulpicie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action presets */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Szybkie ustawienia:</span>
          <div className="flex gap-2">
            <button
              onClick={handleEnableAll}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition"
            >
              Włącz wszystkie
            </button>
            <button
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Domyślne
            </button>
          </div>
        </div>

        {/* Toggles List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 text-slate-800">
          {widgetDefinitions.map((item) => {
            const isEnabled = localConfig[item.key] ?? true;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`p-3.5 rounded-2xl border cursor-pointer select-none transition flex items-center justify-between gap-3 ${
                  isEnabled
                    ? 'bg-teal-50/60 border-teal-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isEnabled ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm text-slate-900 block leading-tight">
                      {item.label}
                    </strong>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </div>

                {/* Switch toggle */}
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 shrink-0 ${
                    isEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Zapisz układ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
