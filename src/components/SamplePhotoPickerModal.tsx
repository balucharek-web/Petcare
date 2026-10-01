import React, { useState } from 'react';
import { SAMPLE_PET_PHOTOS, SamplePetPhoto } from '../data/samplePetPhotos';
import { Species } from '../types/pet';
import { Sparkles, Check, X, Filter } from 'lucide-react';

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

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelectPhoto(selectedUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Galeria przykładowych zdjęć
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wybierz gotowe, piękne zdjęcie dla swojego pupila
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filteredPhotos.map((photo) => {
              const isSelected = selectedUrl === photo.url;
              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedUrl(photo.url)}
                  className={`group relative rounded-2xl overflow-hidden aspect-square cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'border-teal-500 ring-2 ring-teal-500/40 scale-[0.98]'
                      : 'border-transparent hover:border-teal-300 hover:scale-[1.02]'
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4">
                    <p className="text-[10px] font-medium text-white truncate text-center">
                      {photo.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            disabled={!selectedUrl}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Wybierz to zdjęcie
          </button>
        </div>
      </div>
    </div>
  );
};
