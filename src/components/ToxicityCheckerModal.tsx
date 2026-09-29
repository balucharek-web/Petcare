import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  X, 
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { TOXICITY_DATABASE } from '../data/toxicityData';
import { ToxicityCategory, ToxicityItem, ToxicitySeverity, Species } from '../types/pet';

interface ToxicityCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  petSpecies?: Species;
  emergencyPhone?: string;
}

export const ToxicityCheckerModal: React.FC<ToxicityCheckerModalProps> = ({
  isOpen,
  onClose,
  petSpecies = 'dog',
  emergencyPhone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToxicityCategory | 'all'>('all');
  const [speciesFilter, setSpeciesFilter] = useState<'dog' | 'cat'>(
    petSpecies === 'cat' ? 'cat' : 'dog'
  );
  const [selectedItem, setSelectedItem] = useState<ToxicityItem | null>(null);

  if (!isOpen) return null;

  const filteredItems = TOXICITY_DATABASE.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dangerLevelDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityBadge = (severity: ToxicitySeverity) => {
    switch (severity) {
      case 'safe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Bezpieczne
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Ostrożnie
          </span>
        );
      case 'toxic':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <XCircle className="w-3.5 h-3.5 text-orange-600" />
            Toksyczne
          </span>
        );
      case 'deadly':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            ŚMIERTELNE!
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Czy zwierzak może to zjeść?
              </h2>
              <p className="text-xs text-slate-300">Baza toksyczności, objawy zatrucia i pierwsza pomoc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Szukaj: np. czekolada, winogrona, paracetamol, lilia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-teal-600 shadow-xs"
              />
            </div>

            {/* Species Selector */}
            <div className="flex bg-slate-200 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSpeciesFilter('dog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  speciesFilter === 'dog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🐶 Dla Psa
              </button>
              <button
                type="button"
                onClick={() => setSpeciesFilter('cat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  speciesFilter === 'cat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🐱 Dla Kota
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'Wszystkie' },
              { id: 'food', label: '🍎 Żywność' },
              { id: 'human_meds', label: '💊 Leki ludzkie' },
              { id: 'plants', label: '🌿 Rośliny' },
              { id: 'chemicals', label: '⚠️ Chemia domowa' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nie znaleziono w bazie</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Jeśli masz podejrzenie, że zwierzak zjadł coś niebezpiecznego, natychmiast skontaktuj się z lekarzem weterynarii.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const severity = speciesFilter === 'cat' ? item.catSeverity : item.dogSeverity;
              const isSelected = selectedItem?.id === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all ${
                    severity === 'deadly'
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : severity === 'toxic'
                      ? 'bg-orange-50/30 border-orange-200 hover:border-orange-300'
                      : severity === 'caution'
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-emerald-50/30 border-emerald-200'
                  } p-3.5`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">
                        {item.category === 'food' ? '🍎' : item.category === 'plants' ? '🌿' : item.category === 'human_meds' ? '💊' : '⚠️'}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.dangerLevelDescription}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getSeverityBadge(severity)}
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5 text-xs animate-fadeIn">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <strong className="text-slate-800 block">Objawy zatrucia:</strong>
                        <p className="text-slate-600 leading-relaxed">{item.symptoms}</p>
                      </div>

                      <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-100 space-y-1 text-rose-900">
                        <strong className="block flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Pierwsza pomoc & co robić:
                        </strong>
                        <p className="leading-relaxed">{item.firstAid}</p>
                      </div>

                      {item.lethalThreshold && (
                        <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-[11px] text-slate-700">
                          ⚠️ <strong>Dawka krytyczna:</strong> {item.lethalThreshold}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Emergency Quick Action Footer */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-t border-slate-800">
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block">Podejrzewasz zatrucie?</span>
            Liczy się czas – nie czekaj na rozwój objawów!
          </div>

          {emergencyPhone ? (
            <a
              href={`tel:${emergencyPhone}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition active:scale-95"
            >
              <Phone className="w-4 h-4 animate-bounce" />
              <span>Dyżur 24h: {emergencyPhone}</span>
            </a>
          ) : (
            <button
              onClick={() => alert('Skontaktuj się z najbliższą całodobową kliniką weterynaryjną w Twoim mieście.')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
            >
              <Phone className="w-4 h-4" />
              <span>Zadzwoń do kliniki</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
