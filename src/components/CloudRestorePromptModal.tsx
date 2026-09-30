import React from 'react';
import { Cloud, CheckCircle2, Download, X, AlertCircle, ArrowRight } from 'lucide-react';

interface CloudRestorePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreConfirm: () => void;
  petCount: number;
  lastSyncTime?: string | null;
  accountEmail: string;
  isLoading?: boolean;
}

export const CloudRestorePromptModal: React.FC<CloudRestorePromptModalProps> = ({
  isOpen,
  onClose,
  onRestoreConfirm,
  petCount,
  lastSyncTime,
  accountEmail,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Wcześniejszy zapis';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-emerald-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Cloud className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Wykryto wcześniejszą kopię
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
              Przywrócić Twoje zwierzaki?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Dla konta <strong className="text-slate-800 dark:text-slate-200">{accountEmail}</strong> odnaleziono zapisaną kopię zapasową w chmurze PetCare.
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Liczba zwierzaków:</span>
              <span className="font-extrabold text-teal-600 dark:text-teal-400">
                🐾 {petCount} {petCount === 1 ? 'zwierzak' : petCount < 5 ? 'zwierzaki' : 'zwierzaków'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Ostatnia synchronizacja:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(lastSyncTime)}
              </span>
            </div>
            <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zawiera historię szczepień, badań, leków i wizyt.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full space-y-2 pt-2">
            <button
              onClick={onRestoreConfirm}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer text-sm disabled:opacity-60"
            >
              {isLoading ? (
                <span>Przywracanie danych...</span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Tak, przywróć moje zwierzaki</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            >
              Nie przywracaj, zacznij z pustą bazą
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
