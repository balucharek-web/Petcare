import React, { useState } from 'react';
import { 
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
  Phone,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { DashboardConfig, DashboardWidgetKey, DEFAULT_DASHBOARD_CONFIG, DEFAULT_WIDGET_ORDER } from '../types/pet';
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
  const [localConfig, setLocalConfig] = useState<DashboardConfig>(() => ({
    ...config,
    order: config.order && config.order.length > 0 ? [...config.order] : [...DEFAULT_WIDGET_ORDER],
  }));

  const [draggedKey, setDraggedKey] = useState<DashboardWidgetKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<DashboardWidgetKey | null>(null);

  if (!isOpen) return null;

  const widgetDefinitions: { key: DashboardWidgetKey; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      key: 'shortcuts',
      label: 'Szybkie skróty',
      desc: 'Dzisiejsze leki i terminy szczepień',
      icon: Sparkles,
    },
    {
      key: 'aiScanner',
      label: 'Skaner Medyczny AI',
      desc: 'Szybki przycisk aparatu do odczytu recept i badań',
      icon: Camera,
    },
    {
      key: 'nutritionCalculator',
      label: 'Kalkulator Żywienia (RER / MER)',
      desc: 'Dzienne zapotrzebowanie kaloryczne i gramatura karmy',
      icon: Beef,
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
      key: 'chipAndDocs',
      label: 'Mikroczip i Dokumenty',
      desc: '15-cyfrowy numer chipa z kodem kreskowym i paszportem',
      icon: ShieldCheck,
    },
    {
      key: 'weightTracker',
      label: 'Kontrola i wykres wagi',
      desc: 'Historia pomiarów masy ciała i trend',
      icon: Scale,
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

  const currentOrder: DashboardWidgetKey[] = localConfig.order && localConfig.order.length > 0 
    ? localConfig.order 
    : DEFAULT_WIDGET_ORDER;

  // Order definitions according to current order
  const orderedWidgets = [...widgetDefinitions].sort((a, b) => {
    const idxA = currentOrder.indexOf(a.key);
    const idxB = currentOrder.indexOf(b.key);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  const handleToggle = (key: DashboardWidgetKey) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMove = (key: DashboardWidgetKey, direction: 'up' | 'down') => {
    const order = [...currentOrder];
    const index = order.indexOf(key);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    
    // Swap
    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;

    setLocalConfig(prev => ({
      ...prev,
      order,
    }));
  };

  const handleDragStart = (e: React.DragEvent, key: DashboardWidgetKey) => {
    setDraggedKey(key);
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetKey: DashboardWidgetKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== targetKey) {
      setDragOverKey(targetKey);
    }
  };

  const handleDrop = (e: React.DragEvent, targetKey: DashboardWidgetKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    const order = [...currentOrder];
    const fromIndex = order.indexOf(draggedKey);
    const toIndex = order.indexOf(targetKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, draggedKey);
      setLocalConfig(prev => ({
        ...prev,
        order,
      }));
    }

    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleEnableAll = () => {
    const allEnabled: any = { ...localConfig };
    widgetDefinitions.forEach(w => {
      allEnabled[w.key] = true;
    });
    setLocalConfig(allEnabled);
  };

  const handleResetDefaults = () => {
    setLocalConfig({
      ...DEFAULT_DASHBOARD_CONFIG,
      order: [...DEFAULT_WIDGET_ORDER],
    });
  };

  const handleSave = () => {
    storage.saveDashboardConfig(localConfig);
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
              <p className="text-xs text-teal-200/80">
                Przeciągaj kafelki, aby ustalić ich kolejność i widoczność
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action presets */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" />
            <span>Kolejność i widoczność modułów:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEnableAll}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition text-xs"
            >
              Włącz wszystkie
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition flex items-center gap-1 text-xs"
              title="Przywróć domyślny układ i kolejność"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Domyślne
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-teal-50/60 border-b border-teal-100/70 text-[11px] text-teal-900 flex items-center gap-2">
          <span className="font-bold shrink-0">💡 Wskazówka:</span>
          <span>Chwyć za ikonę kropek (⠿), aby przeciągnąć kafelek w inne miejsce lub użyj strzałek ▲ / ▼.</span>
        </div>

        {/* Toggles & Reordering List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 text-slate-800">
          {orderedWidgets.map((item, index) => {
            const isEnabled = localConfig[item.key] ?? true;
            const Icon = item.icon;
            const isBeingDragged = draggedKey === item.key;
            const isTarget = dragOverKey === item.key && draggedKey !== item.key;

            return (
              <div
                key={item.key}
                draggable
                onDragStart={(e) => handleDragStart(e, item.key)}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDrop={(e) => handleDrop(e, item.key)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                  isBeingDragged
                    ? 'opacity-40 border-dashed border-teal-500 scale-[0.98]'
                    : isTarget
                    ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-400 shadow-md'
                    : isEnabled
                    ? 'bg-white border-slate-200 hover:border-teal-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                {/* Drag Handle & Up/Down Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <div 
                    className="p-1 text-slate-400 hover:text-teal-600 cursor-grab active:cursor-grabbing rounded"
                    title="Przeciągnij, aby przenieść"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(item.key, 'up')}
                      className={`p-0.5 rounded hover:bg-slate-100 transition ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-teal-700'}`}
                      title="Przesuń w górę"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedWidgets.length - 1}
                      onClick={() => handleMove(item.key, 'down')}
                      className={`p-0.5 rounded hover:bg-slate-100 transition ${index === orderedWidgets.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:text-teal-700'}`}
                      title="Przesuń w dół"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Number Badge & Icon & Text */}
                <div 
                  onClick={() => handleToggle(item.key)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  <div className={`p-2 rounded-xl shrink-0 ${isEnabled ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <strong className="text-xs sm:text-sm text-slate-900 block leading-tight truncate">
                      {item.label}
                    </strong>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5 truncate">
                      {item.desc}
                    </span>
                  </div>
                </div>

                {/* Switch toggle */}
                <div
                  onClick={() => handleToggle(item.key)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 shrink-0 cursor-pointer ${
                    isEnabled ? 'bg-teal-600' : 'bg-slate-300'
                  }`}
                  title={isEnabled ? 'Wyłącz kafelek' : 'Włącz kafelek'}
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Zapisz kolejność i układ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
