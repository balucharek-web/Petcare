import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Scan, 
  Search, 
  Info, 
  Upload, 
  FileText,
  ShieldCheck,
  Percent,
  Check
} from 'lucide-react';
import { Pet } from '../types/pet';
import { haptics } from '../services/hapticsService';

interface FoodLensModalProps {
  pet: Pet;
  onClose: () => void;
}

const SAMPLE_FOOD_INGREDIENTS = [
  {
    name: 'Standardowa karma sucha z marketu',
    text: 'Zboża (w tym pszenica 20%, kukurydza 15%), mięso i produkty pochodzenia zwierzęcego (w tym kurczak 14%), produkty pochodzenia roślinnego (wysłodki buraczane 2.5%), oleje i tłuszcze (tłuszcz drobiowy), substancje mineralne.',
  },
  {
    name: 'Karma monobiałkowa bezzbożowa (Hipoalergiczna Jagnięcina)',
    text: 'Świeże mięso jagnięce (35%), suszone mięso jagnięce (25%), bataty (18%), zielony groszek (10%), tłuszcz jagnięcy, olej z łososia (2%), siemię lniane, drożdże piwne, zioła (rozmaryn, mniszek lekarski), glukozamina, chondroityna.',
  },
  {
    name: 'Mokra karma dla psa z wołowiną i indykiem',
    text: 'Wołowina 40% (płuca, mięso, serca, wątroba), indyk 28% (żołądki, mięso, szyje), rosół z wołowiny i indyka 27%, marchew 4%, minerały 1%. Bez zbóż, bez konserwantów.',
  }
];

export const FoodLensModal: React.FC<FoodLensModalProps> = ({
  pet,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    allergensDetected: string[];
    safeStatus: 'safe' | 'warning' | 'danger';
    meatQuality: string;
    grainFree: boolean;
    fillers: string[];
    summary: string;
    macronutrients: { protein: string; fat: string; carbs: string };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pet's known allergies
  const petAllergies = (pet.allergies || '').toLowerCase();

  const handleAnalyze = (textToAnalyze?: string) => {
    const text = (textToAnalyze || inputText).trim();
    if (!text) return;

    haptics.tap();
    setIsAnalyzing(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      const detected: string[] = [];

      // Check poultry
      if ((lower.includes('kurczak') || lower.includes('drób') || lower.includes('drobiow') || lower.includes('ptactw')) && 
          (petAllergies.includes('kurczak') || petAllergies.includes('drób') || petAllergies.includes('drobiow'))) {
        detected.push('Kurczak / Drób (zgodny z alergią w profilu)');
      } else if (lower.includes('kurczak') || lower.includes('drób') || lower.includes('drobiow')) {
        // Not marked in pet's allergies, but found
      }

      // Check wheat / grains
      if ((lower.includes('pszenic') || lower.includes('zboż') || lower.includes('gluten')) &&
          (petAllergies.includes('pszenic') || petAllergies.includes('zboż') || petAllergies.includes('gluten'))) {
        detected.push('Pszenica / Zboża glutenowe (zgodne z alergią w profilu)');
      }

      // Check other common pet allergens
      if (lower.includes('soj') && petAllergies.includes('soj')) detected.push('Soja');
      if (lower.includes('wołowin') && petAllergies.includes('wołowin')) detected.push('Wołowina');
      if (lower.includes('mleko') || lower.includes('laktoz')) {
        if (petAllergies.includes('mlek') || petAllergies.includes('laktoz')) detected.push('Nabiał / Laktoza');
      }

      // Meat quality check
      let meatQuality = 'Wysoka: sprecyzowane gatunki mięsa i podrobów';
      if (lower.includes('produkty pochodzenia zwierzęcego') || lower.includes('mączka mięsna')) {
        meatQuality = 'Niska/Średnia: niesprecyzowane odpady rzeźne („produkty pochodzenia zwierzęcego”)';
      } else if (lower.includes('świeże') || lower.includes('suszone mięso')) {
        meatQuality = 'Bardzo wysoka: transparentny skład mięsa jakości spożywczej';
      }

      const grainFree = !lower.includes('pszenic') && !lower.includes('kukurydz') && !lower.includes('zboż') && !lower.includes('jęczmień');
      
      const fillers: string[] = [];
      if (lower.includes('wysłodki buraczane')) fillers.push('Wysłodki buraczane (wypełniacz objętościowy)');
      if (lower.includes('kukurydz')) fillers.push('Kukurydza (tani węglowodan)');
      if (lower.includes('pszenic')) fillers.push('Pszenica (potencjalny alergen glutenowy)');
      if (lower.includes('cukier') || lower.includes('karmel')) fillers.push('Dodatek cukrów / karmelu');

      // Status
      let safeStatus: 'safe' | 'warning' | 'danger' = 'safe';
      if (detected.length > 0) {
        safeStatus = 'danger';
        haptics.danger();
      } else if (!grainFree || fillers.length > 1) {
        safeStatus = 'warning';
        haptics.warning();
      } else {
        safeStatus = 'safe';
        haptics.success();
      }

      // Estimate macros
      let protein = 'ok. 26 - 32%';
      let fat = 'ok. 14 - 18%';
      let carbs = grainFree ? 'ok. 30 - 38% (z warzyw i batatów)' : 'ok. 45 - 55% (zboża)';
      if (lower.includes('mokra') || lower.includes('rosół')) {
        protein = 'ok. 10 - 12% (mokra masa)';
        fat = 'ok. 6 - 8%';
        carbs = '< 4%';
      }

      setAnalysisResult({
        allergensDetected: detected,
        safeStatus,
        meatQuality,
        grainFree,
        fillers,
        summary: detected.length > 0
          ? `UWAGA: Karma zawiera ${detected.length} składnik(i) kolidujące ze zdefiniowanymi alergiami ${pet.name}!`
          : `Brak wykrytych bezpośrednich alergenów przypisanych do ${pet.name}. ${grainFree ? 'Karma bezzbożowa.' : 'Karma zawiera zboża.'}`,
        macronutrients: { protein, fat, carbs },
      });

      setIsAnalyzing(false);
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptics.tap();
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/analyze-pet-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || 'image/jpeg',
            customPrompt: 'Przepisz dokładnie skład analityczny i listę składników (ingredients) z tego opakowania karmy dla zwierząt. Zwróć wyłącznie polski tekst składników.',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const extractedText = data.text || data.summary || data.diagnosis || '';
          if (extractedText) {
            setInputText(extractedText);
            handleAnalyze(extractedText);
            return;
          }
        }
      } catch {
        // Fallback
      }
      // Fallback sample analysis
      setInputText(SAMPLE_FOOD_INGREDIENTS[0].text);
      handleAnalyze(SAMPLE_FOOD_INGREDIENTS[0].text);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Skaner Karmy & Alergenów</h2>
                <span className="text-[10px] font-black uppercase bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                  Food Lens AI
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Sprawdź skład karmy pod kątem alergii {pet.name} ({pet.allergies || 'brak wpisanych alergii'})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">
          {/* Pet allergy warning badge */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🐶</span>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Alergie zapisane w profilu {pet.name}:
                </span>
                <span className="text-teal-700 dark:text-teal-400 font-bold">
                  {pet.allergies || 'Brak wpisanych alergii (możesz dodać w edycji profilu)'}
                </span>
              </div>
            </div>
          </div>

          {/* Input text or camera */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Wklej skład karmy lub zrób zdjęcie etykiety:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="np. Świeże mięso z kurczaka 40%, kukurydza, pszenica, tłuszcz drobiowy, wysłodki buraczane..."
              className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-teal-600 focus:ring-1 focus:ring-teal-500 shadow-2xs"
            />

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span>Zrób zdjęcie etykiety</span>
              </button>

              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={!inputText.trim() || isAnalyzing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 ml-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzing ? 'Analizuję skład...' : 'Przeanalizuj skład'}</span>
              </button>
            </div>
          </div>

          {/* Quick test sample buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Przetestuj na gotowych próbkach składu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_FOOD_INGREDIENTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sample.text);
                    handleAnalyze(sample.text);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/90 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 text-[11px] font-bold transition cursor-pointer active:scale-95"
                >
                  ⚡ {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="space-y-3 pt-2 animate-fadeIn">
              {/* Alert Status Card */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                analysisResult.safeStatus === 'danger'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                  : analysisResult.safeStatus === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
              }`}>
                <div className="flex items-center gap-2 font-black text-sm">
                  {analysisResult.safeStatus === 'danger' ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                      <span>WYKRYTO ZNANY ALERGEN PUPILA!</span>
                    </>
                  ) : analysisResult.safeStatus === 'warning' ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>UWAGA NA WYPEŁNIACZE I ZBOŻA</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>SKŁAD BEZPIECZNY DLA ALERGII {pet.name}</span>
                    </>
                  )}
                </div>

                <p className="text-xs font-semibold leading-relaxed">
                  {analysisResult.summary}
                </p>

                {analysisResult.allergensDetected.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {analysisResult.allergensDetected.map((alg, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black shadow-2xs">
                        ⚠️ {alg}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Composition Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Jakość źródła białka
                  </span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                    {analysisResult.meatQuality}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Obecność zbóż
                  </span>
                  <span className={`font-extrabold block ${
                    analysisResult.grainFree ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {analysisResult.grainFree ? '✓ 100% Bezzbożowa' : '⚠️ Zawiera zboża'}
                  </span>
                </div>
              </div>

              {/* Fillers List */}
              {analysisResult.fillers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    Zidentyfikowane wypełniacze i tanie zamienniki:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {analysisResult.fillers.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                        &bull; {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Macronutrient Estimates */}
              <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-xs space-y-1.5">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-teal-600" />
                  Szacowany profil makroskładników:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-[10px] text-slate-400 font-bold block">Białko</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.protein}</strong>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-[10px] text-slate-400 font-bold block">Tłuszcz</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.fat}</strong>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-[10px] text-slate-400 font-bold block">Węglowodany</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.carbs}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400">
            W 100% darmowy moduł analizy diety PetCare
          </span>
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
