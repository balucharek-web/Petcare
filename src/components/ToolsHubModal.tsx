import React from 'react';
import { 
  FileText, 
  ShieldAlert, 
  Camera, 
  Beef, 
  Wallet, 
  HeartHandshake, 
  Sliders, 
  Settings, 
  X, 
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Pet } from '../types/pet';

interface ToolsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onOpenMedicalReport: () => void;
  onOpenToxicityChecker: () => void;
  onOpenAIScanner: () => void;
  onOpenNutritionCalculator: () => void;
  onOpenExpenses: () => void;
  onOpenPetsitter: () => void;
  onOpenDashboardCustomizer: () => void;
  onOpenSettings: () => void;
}

export const ToolsHubModal: React.FC<ToolsHubModalProps> = ({
  isOpen,
  onClose,
  pet,
  onOpenMedicalReport,
  onOpenToxicityChecker,
  onOpenAIScanner,
  onOpenNutritionCalculator,
  onOpenExpenses,
  onOpenPetsitter,
  onOpenDashboardCustomizer,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const tools = [
    {
      id: 'report',
      label: 'Raport Medyczny & Książeczka PDF',
      desc: 'Gotowy dokument do druku dla weterynarza i na ostry dyżur',
      icon: FileText,
      color: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
      action: onOpenMedicalReport,
    },
    {
      id: 'toxic',
      label: 'Czy zwierzak może to zjeść?',
      desc: 'Baza toksyczności jedzenia, leków i roślin z pierwszą pomocą',
      icon: ShieldAlert,
      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      action: onOpenToxicityChecker,
    },
    {
      id: 'scanner',
      label: 'Inteligentny Skaner Medyczny AI',
      desc: 'Aparat do automatycznego odczytu recept i wyników krwi',
      icon: Camera,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      badge: 'Gemini AI',
      action: onOpenAIScanner,
    },
    {
      id: 'nutrition',
      label: 'Kalkulator Żywienia (RER / MER)',
      desc: 'Dzienne kalorie i gramatura karmy mokrej/suchej',
      icon: Beef,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      action: onOpenNutritionCalculator,
    },
    {
      id: 'expenses',
      label: 'Wydatki i Finanse Zwierzaka',
      desc: 'Budżet, podsumowania miesięczne i roczne koszty opieki',
      icon: Wallet,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      action: onOpenExpenses,
    },
    {
      id: 'petsitter',
      label: 'Karta Petsittera / Opiekuna',
      desc: 'Harmonogram karmienia, spacerów i zwyczaje w SMS/druku',
      icon: HeartHandshake,
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      action: onOpenPetsitter,
    },
    {
      id: 'customizer',
      label: 'Dostosuj Stronę Główną',
      desc: 'Włącz lub wyłącz kafelki widoczne na pulpicie głównym',
      icon: Sliders,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      action: onOpenDashboardCustomizer,
    },
    {
      id: 'settings',
      label: 'Kopia Danych & PWA',
      desc: 'Pobierz kopię JSON, przywróć plik lub pobierz APK',
      icon: Settings,
      color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      action: onOpenSettings,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Menu Narzędzi PetCare
              </h2>
              <p className="text-xs text-slate-300">Wszystkie moduły i asystenci dla: {pet.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tools Grid / List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                onClick={() => {
                  onClose();
                  tool.action();
                }}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-300 flex items-center justify-between gap-3 text-left transition shadow-xs active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs sm:text-sm text-slate-900 leading-tight">
                        {tool.label}
                      </strong>
                      {tool.badge && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {tool.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
