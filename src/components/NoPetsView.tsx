import React from 'react';
import { Plus, Heart, Sparkles, Cloud, QrCode, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';

interface NoPetsViewProps {
  onOpenNewPetModal: () => void;
  onRestoreSamplePet: () => void;
  onOpenGoogleSync: () => void;
  onOpenQRTransfer: () => void;
}

export const NoPetsView: React.FC<NoPetsViewProps> = ({
  onOpenNewPetModal,
  onRestoreSamplePet,
  onOpenGoogleSync,
  onOpenQRTransfer,
}) => {
  return (
    <div className="max-w-lg mx-auto py-8 px-4 text-center animate-fadeIn space-y-6">
      <div className="relative mx-auto w-24 h-24 rounded-3xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center ring-8 ring-teal-500/5">
        <Heart className="w-12 h-12 stroke-[1.75]" />
        <span className="absolute -bottom-1 -right-1 text-2xl">🐾</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Nie masz jeszcze żadnego zwierzaka
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Dodaj profil swojego pupila, aby prowadzić jego książeczkę zdrowia, kontrolować podawanie leków, wagę oraz terminy szczepień.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={onOpenNewPetModal}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm shadow-lg shadow-teal-600/25 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Dodaj nowego zwierzaka</span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onRestoreSamplePet}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500/50 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Wczytaj profil przykładowy</span>
          </button>

          <button
            type="button"
            onClick={onOpenGoogleSync}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pobierz z Dysku Google</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenQRTransfer}
          className="text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 font-semibold inline-flex items-center gap-1.5 transition pt-2 cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Lub odbierz dane kodem QR z drugiego telefonu</span>
        </button>
      </div>
    </div>
  );
};
