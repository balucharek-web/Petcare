import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SAMPLE_PET_PHOTOS } from '../data/samplePetPhotos';
import { Species } from '../types/pet';
import { Sparkles, Check, X } from 'lucide-react';

interface SamplePhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (url: string) => void;
  initialSpecies?: Species;
  currentPhotoUrl?: string;
}

export const SamplePhotoPickerModal: React.FC<SamplePhotoPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPhoto,
  initialSpecies,
  currentPhotoUrl,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialSpecies || 'all');
  const [selectedUrl, setSelectedUrl] = useState<string>(currentPhotoUrl || '');

  if (!isOpen) return null;

  const categories: { key: string; label: string; icon: string }[] = [
    { key: 'all', label: 'Wszystkie', icon: '🐾' },
    { key: 'dog', label: 'Psy', icon: '🐶' },
    { key: 'cat', label: 'Koty', icon: '🐱' },
    { key: 'rabbit', label: 'Króliki', icon: '🐰' },
    { key: 'ferret', label: 'Fretki', icon: '🦡' },
    { key: 'bird', label: 'Ptaki', icon: '🦜' },
    { key: 'other', label: 'Inne pupile', icon: '🐹' },
  ];

  const filteredPhotos = selectedCategory === 'all'
    ? SAMPLE_PET_PHOTOS
    : SAMPLE_PET_PHOTOS.filter((p) => p.species === selectedCategory);

  const handlePhotoClick = (url: string) => {
    setSelectedUrl(url);
    onSelectPhoto(url);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelectPhoto(selectedUrl);
      onClose();
    }
  };

  const modalNode = (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 max-h-[82vh] sm:max-h-[88vh] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] z-10">
        
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Galeria przykładowych zdjęć
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dotknij wybranego zdjęcia, aby od razu je ustawić
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none shrink-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Photo Grid - fully scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 my-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedUrl === photo.url;
              return (
                <div
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo.url)}
                  className={`group relative rounded-2xl overflow-hidden aspect-square cursor-pointer transition-all border-2 active:scale-95 ${
                    isSelected
                      ? 'border-teal-500 ring-2 ring-teal-500/40 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-teal-900/40 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1 pt-3">
                    <p className="text-xs font-bold text-white truncate text-center">
                      {photo.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Zamknij
          </button>
          <button
            type="button"
            disabled={!selectedUrl}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Zatwierdź wybór</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
