import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Heart, 
  Activity, 
  ShieldCheck, 
  Calendar, 
  Info, 
  CheckCircle2, 
  Stethoscope, 
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Pet, Species } from '../types/pet';

interface AgeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
}

export type DogSizeCategory = 'small' | 'medium' | 'large' | 'giant';

export interface LifeStageInfo {
  stageName: string;
  stageBadge: string;
  colorClass: string;
  badgeClass: string;
  summary: string;
  recommendedCheckups: string[];
  dietaryTips: string;
  isSenior: boolean;
}

/**
 * Calculates human age accurately according to AVMA / AAHA and AAFP guidelines.
 */
export function calculatePetHumanAge(
  species: Species,
  years: number,
  months: number,
  weightKg: number
): { humanAge: number; dogSize: DogSizeCategory; lifeStage: LifeStageInfo } {
  const totalYears = Math.max(0, years + months / 12);

  // Determine size category for dogs
  let dogSize: DogSizeCategory = 'medium';
  if (weightKg <= 10) dogSize = 'small';
  else if (weightKg <= 25) dogSize = 'medium';
  else if (weightKg <= 45) dogSize = 'large';
  else dogSize = 'giant';

  let humanAge = 0;

  if (species === 'cat') {
    // Cats (AAFP curve)
    if (totalYears <= 0) humanAge = 0;
    else if (totalYears <= 1) humanAge = Math.round(totalYears * 15);
    else if (totalYears <= 2) humanAge = Math.round(15 + (totalYears - 1) * 9); // 24 at 2 yrs
    else humanAge = Math.round(24 + (totalYears - 2) * 4);
  } else if (species === 'dog') {
    // Dogs by size (AAHA curve)
    if (dogSize === 'small') {
      if (totalYears <= 1) humanAge = Math.round(totalYears * 15);
      else if (totalYears <= 2) humanAge = Math.round(15 + (totalYears - 1) * 9);
      else humanAge = Math.round(24 + (totalYears - 2) * 4);
    } else if (dogSize === 'medium') {
      if (totalYears <= 1) humanAge = Math.round(totalYears * 15);
      else if (totalYears <= 2) humanAge = Math.round(15 + (totalYears - 1) * 9);
      else humanAge = Math.round(24 + (totalYears - 2) * 5);
    } else if (dogSize === 'large') {
      if (totalYears <= 1) humanAge = Math.round(totalYears * 15);
      else if (totalYears <= 2) humanAge = Math.round(15 + (totalYears - 1) * 9);
      else if (totalYears <= 5) humanAge = Math.round(24 + (totalYears - 2) * 6);
      else humanAge = Math.round(42 + (totalYears - 5) * 7);
    } else {
      // Giant dogs (>45 kg) mature fast and age very rapidly
      if (totalYears <= 1) humanAge = Math.round(totalYears * 12);
      else if (totalYears <= 2) humanAge = Math.round(12 + (totalYears - 1) * 10); // 22 at 2 yrs
      else humanAge = Math.round(22 + (totalYears - 2) * 8.5);
    }
  } else if (species === 'rabbit') {
    if (totalYears <= 1) humanAge = Math.round(totalYears * 20);
    else if (totalYears <= 2) humanAge = Math.round(20 + (totalYears - 1) * 8);
    else humanAge = Math.round(28 + (totalYears - 2) * 6.5);
  } else if (species === 'ferret') {
    if (totalYears <= 1) humanAge = Math.round(totalYears * 18);
    else humanAge = Math.round(18 + (totalYears - 1) * 9);
  } else {
    // Generic animal curve
    humanAge = Math.round(totalYears * 6.5);
  }

  // Determine Life Stage
  let lifeStage: LifeStageInfo;

  if (totalYears < 1) {
    lifeStage = {
      stageName: 'Junior / Młodość',
      stageBadge: 'Junior 🍼',
      colorClass: 'text-amber-600 bg-amber-50 border-amber-200',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      summary: 'Okres intensywnego wzrostu kośćca, budowania odporności i socjalizacji.',
      recommendedCheckups: [
        'Cykl szczepień bazowych (wirusy + wścieklizna)',
        'Odrobaczanie co 1–3 miesiące',
        'Zabezpieczenie przed kleszczami i pchłami',
        'Konsultacja ortopedyczna i ocena zębów stałych',
      ],
      dietaryTips: 'Wymaga karmy typu Puppy/Junior o wyższej gęstości energetycznej i zbilansowanym wapniu.',
      isSenior: false,
    };
  } else if (totalYears < (species === 'dog' && dogSize === 'giant' ? 5 : species === 'dog' && dogSize === 'large' ? 6 : 7)) {
    lifeStage = {
      stageName: 'Dorosłość (Adult)',
      stageBadge: 'Dorosły ⚡',
      colorClass: 'text-teal-600 bg-teal-50 border-teal-200',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
      summary: 'Szczyt formy fizycznej i odpornościowej. Kluczowa jest kontrola wagi i profilaktyka.',
      recommendedCheckups: [
        'Coroczne badanie kontrolne i szczepienie przypominające',
        'Higiena jamy ustnej i czyszczenie zębów',
        'Profilaktyczne badanie krwi raz na rok lub przed zabiegami',
        'Monitorowanie wagi (zapobieganie otyłości)',
      ],
      dietaryTips: 'Karma bytowa dopasowana do aktywności, z kontrolowaną zawartością tłuszczu.',
      isSenior: false,
    };
  } else if (totalYears < (species === 'dog' && dogSize === 'giant' ? 8 : 10)) {
    lifeStage = {
      stageName: 'Dojrzały Senior (Mature)',
      stageBadge: 'Senior 🎖️',
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      summary: 'Wkraczanie w wiek dojrzały. Spada metabolizm, wzrasta ryzyko zmian nerkowych i zwyrodnień stawów.',
      recommendedCheckups: [
        'Profil geriatryczny krwi (morfologia, nerki: mocznik, kreatynina, SDMA; wątroba: ALT, AP, bilirubina)',
        'Badanie ogólne moczu z osadem i białkiem',
        'USG profilaktyczne jamy brzusznej (śledziona, nerki, pęcherz)',
        'Suplementacja stawów (chondroityna, glukozamina, kwasy Omega-3 EPA/DHA)',
      ],
      dietaryTips: 'Wzbogacenie diety w przeciwutleniacze, łatwostrawne białko i kwasy tłuszczowe EPA/DHA.',
      isSenior: true,
    };
  } else {
    lifeStage = {
      stageName: 'Geriatryczny (Super Senior)',
      stageBadge: 'Złoty Wiek 👑',
      colorClass: 'text-purple-600 bg-purple-50 border-purple-200',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
      summary: 'Wiek zasłużonego odpoczynku. Wymaga łagodnej, regularnej opieki weterynaryjnej i komfortu.',
      recommendedCheckups: [
        'Badania krwi i moczu co 6 miesięcy (wczesne wykrywanie PNN)',
        'Pomiar ciśnienia tętniczego krwi (ryzyko nadciśnienia)',
        'Echo serca / EKG (zwłaszcza przy kaszlu lub męczliwości)',
        'Ocena funkcji poznawczych (CCD / demencja starcza) i wzroku',
        'Terapia przeciwbólowa przy chorobie zwyrodnieniowej stawów (NLPZ / monoklonalne przeciwciała)',
      ],
      dietaryTips: 'Dieta lekkostrawna, kontrolowany fosfor, karma o podwyższonej smakowitości i miękkiej strukturze.',
      isSenior: true,
    };
  }

  return { humanAge, dogSize, lifeStage };
}

export const AgeCalculatorModal: React.FC<AgeCalculatorModalProps> = ({
  isOpen,
  onClose,
  pet,
}) => {
  // Parse initial age from pet birthDate
  const getInitialYearsMonths = () => {
    if (!pet.birthDate) return { y: 3, m: 0 };
    const birth = new Date(pet.birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    return { y: Math.max(0, years), m: Math.max(0, months) };
  };

  const initial = getInitialYearsMonths();
  const [selectedYears, setSelectedYears] = useState<number>(initial.y);
  const [selectedMonths, setSelectedMonths] = useState<number>(initial.m);
  const [selectedWeight, setSelectedWeight] = useState<number>(pet.weightKg || 12);
  const [selectedSpecies, setSelectedSpecies] = useState<Species>(pet.species || 'dog');

  if (!isOpen) return null;

  const result = calculatePetHumanAge(selectedSpecies, selectedYears, selectedMonths, selectedWeight);

  const resetToPetValues = () => {
    const init = getInitialYearsMonths();
    setSelectedYears(init.y);
    setSelectedMonths(init.m);
    setSelectedWeight(pet.weightKg || 12);
    setSelectedSpecies(pet.species || 'dog');
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Kalkulator Wieku Pupila</h2>
              <p className="text-xs text-teal-100">Przelicznik na ludzkie lata & przewodnik seniora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Main Hero Result Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {selectedSpecies === 'dog' ? '🐶' : selectedSpecies === 'cat' ? '🐱' : '🐾'}
                </span>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {pet.name} ma biologicznie:
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedYears} {selectedYears === 1 ? 'rok' : selectedYears < 5 ? 'lata' : 'lat'}
                    {selectedMonths > 0 ? ` i ${selectedMonths} mies.` : ''} metrykalnie
                  </p>
                </div>
              </div>

              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${result.lifeStage.badgeClass}`}>
                {result.lifeStage.stageBadge}
              </span>
            </div>

            {/* Huge Human Age Display */}
            <div className="my-4 py-3 bg-white/10 rounded-2xl border border-white/10 text-center relative z-10 backdrop-blur-sm">
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider block">
                Odpowiednik w latach ludzkich
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight my-1 flex items-center justify-center gap-1.5">
                <span>ok.</span>
                <span className="text-teal-400">{result.humanAge}</span>
                <span className="text-2xl font-bold text-slate-300">lat</span>
              </div>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                {selectedSpecies === 'dog' ? (
                  result.dogSize === 'small' ? 'Pies małej rasy (≤10 kg)' :
                  result.dogSize === 'medium' ? 'Pies średniej rasy (10–25 kg)' :
                  result.dogSize === 'large' ? 'Pies dużej rasy (25–45 kg)' :
                  'Pies rasy olbrzymiej (>45 kg)'
                ) : selectedSpecies === 'cat' ? 'Kot domowy (krzywa AAFP)' : 'Zwierzę domowe'}
              </p>
            </div>

            <p className="text-xs text-slate-300 relative z-10 leading-relaxed">
              {result.lifeStage.summary}
            </p>
          </div>

          {/* Interactive Sliders & Switchers */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Dostosuj wiek do przeliczenia:
              </span>
              <button
                onClick={resetToPetValues}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition underline underline-offset-2"
              >
                Przywróć dane {pet.name}
              </button>
            </div>

            {/* Years slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Lata metrykalne:</span>
                <span className="font-bold text-slate-900">{selectedYears} lat</span>
              </div>
              <input
                type="range"
                min="0"
                max="22"
                value={selectedYears}
                onChange={(e) => setSelectedYears(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0 lat</span>
                <span>5 lat</span>
                <span>10 lat</span>
                <span>15 lat</span>
                <span>20+ lat</span>
              </div>
            </div>

            {/* Months slider if under 3 years */}
            {selectedYears <= 3 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Dodatkowe miesiące:</span>
                  <span className="font-bold text-slate-900">{selectedMonths} mies.</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="11"
                  value={selectedMonths}
                  onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>
            )}

            {/* Dog Weight & Size Category */}
            {selectedSpecies === 'dog' && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Waga psa (wpływa na tempo starzenia):</span>
                  <span className="font-bold text-slate-900">{selectedWeight} kg</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { key: 'small', label: 'Mały', range: '≤10 kg', w: 7 },
                    { key: 'medium', label: 'Średni', range: '10–25 kg', w: 16 },
                    { key: 'large', label: 'Duży', range: '25–45 kg', w: 32 },
                    { key: 'giant', label: 'Olbrzym', range: '>45 kg', w: 55 },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedWeight(s.w)}
                      className={`p-2 rounded-xl text-xs transition border ${
                        result.dogSize === s.key
                          ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="font-bold leading-tight">{s.label}</div>
                      <div className="text-xs opacity-80">{s.range}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Educational Note: Why 1 dog year != 7 human years */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 flex gap-2.5 items-start text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block">Dlaczego mit „1 rok = 7 lat” jest błędny?</span>
              <p className="text-xs leading-relaxed text-amber-900">
                Pies w wieku 1 roku osiąga dojrzałość płciową i emocjonalną odpowiadającą ludzkiemu 15-latkowi (nie 7-latkowi!). 
                W wieku 2 lat to już ok. 24 lata ludzkie. Później tempo zwalnia, a rasy olbrzymie starzeją się znacznie szybciej niż małe czworonogi.
              </p>
            </div>
          </div>

          {/* Senior Care & Preventive Recommendations */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Zalecenia profilaktyczne dla etapu: {result.lifeStage.stageName}
            </h4>

            <div className="space-y-2">
              {result.lifeStage.recommendedCheckups.map((checkup, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-slate-800 font-medium leading-relaxed">{checkup}</span>
                </div>
              ))}
            </div>

            {/* Diet tip */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900">
              <span className="font-bold block text-emerald-950 mb-0.5">🥗 Wskazówka żywieniowa dla tego etapu:</span>
              <p className="text-xs text-emerald-800 leading-relaxed">{result.lifeStage.dietaryTips}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Oparte o wytyczne weterynaryjne AAHA & AAFP
          </span>
          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
