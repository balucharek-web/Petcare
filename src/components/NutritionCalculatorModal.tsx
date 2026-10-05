import React, { useState } from 'react';
import { 
  Beef, 
  Scale, 
  Sparkles, 
  X, 
  Info, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Utensils,
  Flame,
  ChevronDown
} from 'lucide-react';
import { Pet } from '../types/pet';

interface NutritionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
}

export type ActivityLevel = 'neutered_adult' | 'intact_adult' | 'weight_loss' | 'senior_low' | 'active_working' | 'puppy_kitten';

export const NutritionCalculatorModal: React.FC<NutritionCalculatorModalProps> = ({
  isOpen,
  onClose,
  pet,
}) => {
  const [weightKg, setWeightKg] = useState<number>(pet.weightKg || 10);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    pet.isNeutered ? 'neutered_adult' : 'intact_adult'
  );
  const [foodType, setFoodType] = useState<'dry' | 'wet' | 'custom'>('dry');
  const [foodKcalPer100g, setFoodKcalPer100g] = useState<number>(360);
  const [mealsPerDay, setMealsPerDay] = useState<number>(2);

  if (!isOpen) return null;

  // Formula: RER = 70 * (weight)^0.75
  const calculateRER = (weight: number): number => {
    return Math.round(70 * Math.pow(Math.max(0.5, weight), 0.75));
  };

  const getMultiplier = (activity: ActivityLevel, isCat: boolean): number => {
    if (isCat) {
      switch (activity) {
        case 'neutered_adult': return 1.2;
        case 'intact_adult': return 1.4;
        case 'weight_loss': return 0.8;
        case 'senior_low': return 1.0;
        case 'active_working': return 1.6;
        case 'puppy_kitten': return 2.5;
        default: return 1.2;
      }
    } else {
      switch (activity) {
        case 'neutered_adult': return 1.6;
        case 'intact_adult': return 1.8;
        case 'weight_loss': return 1.0;
        case 'senior_low': return 1.2;
        case 'active_working': return 2.5;
        case 'puppy_kitten': return 2.8;
        default: return 1.6;
      }
    }
  };

  const isCat = pet.species === 'cat';
  const rer = calculateRER(weightKg);
  const factor = getMultiplier(activityLevel, isCat);
  const dailyKcal = Math.round(rer * factor);

  // Daily food in grams: (dailyKcal / foodKcalPer100g) * 100
  const dailyGrams = Math.round((dailyKcal / (foodKcalPer100g || 1)) * 100);
  const portionGrams = Math.round(dailyGrams / mealsPerDay);

  // Weight trend from history
  const history = pet.weightHistory || [];
  const prevWeight = history.length >= 2 ? history[history.length - 2].weightKg : null;
  const weightDiff = prevWeight !== null ? +(weightKg - prevWeight).toFixed(2) : null;

  const handleFoodTypePreset = (type: 'dry' | 'wet') => {
    setFoodType(type);
    if (type === 'dry') setFoodKcalPer100g(360);
    if (type === 'wet') setFoodKcalPer100g(95);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-amber-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-400/30">
              <Beef className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Kalkulator Żywienia i Kalorii (RER / MER)
              </h2>
              <p className="text-xs text-amber-200/80">
                Precyzyjna dawka karmy dla: {pet.name} ({isCat ? 'Kot' : 'Pies'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Main Results Highlight */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-teal-500/5 to-slate-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Zalecane zapotrzebowanie
              </span>
              <div className="text-3xl font-black text-slate-900 mt-1 flex items-baseline justify-center sm:justify-start gap-1">
                <span>{dailyKcal}</span>
                <span className="text-sm font-semibold text-slate-500">kcal / dzień</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                RER: {rer} kcal &bull; Współczynnik stanu: &times;{factor}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm shrink-0 min-w-36 text-center">
              <span className="text-xs uppercase font-bold text-slate-400 block">Dzienna porcja</span>
              <strong className="text-2xl font-black text-teal-700 block mt-0.5">
                {dailyGrams} g
              </strong>
              <span className="text-xs text-slate-500 block">
                {mealsPerDay} posiłki po <strong>{portionGrams} g</strong>
              </span>
            </div>
          </div>

          {/* Parameters Form */}
          <div className="space-y-4 text-xs">
            {/* Weight input & trend */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-teal-600" />
                  Waga zwierzaka (kg)
                </label>
                {weightDiff !== null && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    weightDiff > 0 ? 'text-amber-600' : weightDiff < 0 ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {weightDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : weightDiff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {weightDiff > 0 ? `+${weightDiff} kg` : `${weightDiff} kg`} vs ost. pomiar
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="120"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-teal-600"
              />
            </div>

            {/* Physiological & Activity Status */}
            <div>
              <label htmlFor="nutrition-field-1" className="font-bold text-slate-700 block mb-1">
                Faza życia i poziom aktywności
              </label>
              <select id="nutrition-field-1"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-teal-600"
              >
                <option value="neutered_adult">Dorosły kastrowany / sterylizowany (standard)</option>
                <option value="intact_adult">Dorosły niekastrowany (aktywny)</option>
                <option value="weight_loss">Dieta odchudzająca / redukcja masy</option>
                <option value="senior_low">Senior / mała aktywność fizyczna</option>
                <option value="active_working">Pies pracujący / sportowy / intensywny ruch</option>
                <option value="puppy_kitten">Szczeniak / Kocię (faza wzrostu)</option>
              </select>
            </div>

            {/* Food type & calories */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  Kaloryczność karmy
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleFoodTypePreset('dry')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      foodType === 'dry' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Karma sucha (~360 kcal)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFoodTypePreset('wet')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      foodType === 'wet' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Karma mokra (~95 kcal)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nutrition-field-2" className="text-xs text-slate-500 block mb-1">Kcal w 100g karmy</label>
                  <input id="nutrition-field-2"
                    type="number"
                    value={foodKcalPer100g}
                    onChange={(e) => {
                      setFoodType('custom');
                      setFoodKcalPer100g(parseInt(e.target.value) || 0);
                    }}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-teal-600"
                  />
                </div>
                <div>
                  <label htmlFor="nutrition-field-3" className="text-xs text-slate-500 block mb-1">Liczba posiłków dziennie</label>
                  <select id="nutrition-field-3"
                    value={mealsPerDay}
                    onChange={(e) => setMealsPerDay(parseInt(e.target.value) || 2)}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-teal-600"
                  >
                    <option value={1}>1 posiłek</option>
                    <option value={2}>2 posiłki (rano / wieczór)</option>
                    <option value={3}>3 posiłki (rano / obiad / wieczór)</option>
                    <option value={4}>4 posiłki (szczeniak)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scientific note */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 text-teal-900 space-y-1">
              <strong className="block font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                Wskazówka dietetyczna:
              </strong>
              <p className="text-xs leading-relaxed text-teal-800">
                Pamiętaj o uwzględnieniu w bilansie smaczków i gryzaków treningowych (powinny stanowić max 10% dziennej puli kalorii). Kontroluj wagę co 2-3 tygodnie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
