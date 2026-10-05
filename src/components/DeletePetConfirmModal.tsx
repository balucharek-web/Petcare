import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Pet } from '../types/pet';

interface DeletePetConfirmModalProps {
  isOpen: boolean;
  pet: Pet | null;
  onClose: () => void;
  onConfirmDelete: (petId: string) => void;
  isLastPet?: boolean;
}

export const DeletePetConfirmModal: React.FC<DeletePetConfirmModalProps> = ({
  isOpen,
  pet,
  onClose,
  onConfirmDelete,
  isLastPet = false,
}) => {
  if (!isOpen || !pet) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Usunięcie profilu zwierzaka
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pet Preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
          <img
            src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
            alt={pet.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-rose-400 shadow-sm shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-slate-900 dark:text-white text-base truncate">
              {pet.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {pet.breed || 'Mieszaniec'} &bull; {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Inne'}
            </p>
          </div>
        </div>

        {/* Warning text */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Czy na pewno chcesz bezpowrotnie usunąć profil pupila <strong>{pet.name}</strong>?
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">Wraz z profilem zostaną usunięte:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
              <li>Wszystkie dawki i aktywne leki</li>
              <li>Wpisy o szczepieniach i odrobaczeniach</li>
              <li>Badania laboratoryjne, USG, RTG</li>
              <li>Historia wizyt i chorób przewlekłych</li>
              <li>Wykres pomiarów wagi i wydatki</li>
            </ul>
          </div>
          {isLastPet && (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              To jedyny zwierzak na Twoim koncie. Po usunięciu będziesz mógł dodać nowego pupila lub załadować dane testowe.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(pet.id);
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tak, usuń</span>
          </button>
        </div>
      </div>
    </div>
  );
};
