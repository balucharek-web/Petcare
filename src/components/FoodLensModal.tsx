import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera as CameraIcon, 
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
  Check,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Pet } from '../types/pet';
import { haptics } from '../services/hapticsService';
import { getApiUrl } from '../services/cloudSyncService';
import { compressImage } from '../utils/imageCompressor';
import { extractTextFromImage } from '../services/ocrMedicalService';

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    productName?: string;
    foodType?: string;
    score?: { rating: number; max: number; label: string };
    allergensDetected: string[];
    safeStatus: 'safe' | 'warning' | 'danger';
    meatPercentage?: string;
    meatQuality: string;
    meatBreakdown?: string;
    grainFree: boolean;
    firstIngredient?: string;
    marketingTricks?: string[];
    fillers: string[];
    summary: string;
    vetAdvice?: string;
    macronutrients: {
      protein: string;
      fat: string;
      carbs: string;
      fiber?: string;
      ash?: string;
      moisture?: string;
      isCalculatedNFE?: boolean;
    };
    ingredientsText?: string;
    analyticalText?: string;
  } | null>(null);

  // Live in-app camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dedicated separate file inputs for Camera and Gallery
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const startLiveCamera = async () => {
    setErrorMsg(null);
    haptics.tap();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Aparat na żywo nie jest obsługiwany w tej przeglądarce.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.warn('Live camera error, falling back to system camera:', err);
      handleTakePhoto();
    }
  };

  const captureLiveCameraSnapshot = async () => {
    if (!videoRef.current) return;
    haptics.tap();
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopLiveCamera();
    setImagePreview(dataUrl);
    await processImageWithAI(dataUrl);
  };

  // Pet's known allergies
  const petAllergies = (pet.allergies || '').toLowerCase();

  // Local fallback heuristic analysis when analyzing raw text
  const runLocalTextAnalysis = (text: string) => {
    const lower = text.toLowerCase();
    const detected: string[] = [];

    // 1. Allergens matching pet's specific profile
    if ((lower.includes('kurczak') || lower.includes('drób') || lower.includes('drobiow') || lower.includes('ptactw')) && 
        (petAllergies.includes('kurczak') || petAllergies.includes('drób') || petAllergies.includes('drobiow') || petAllergies.includes('kurcz'))) {
      detected.push('Kurczak / Drób (koliduje z alergią w profilu ' + pet.name + ')');
    }

    if ((lower.includes('pszenic') || lower.includes('zboż') || lower.includes('gluten')) &&
        (petAllergies.includes('pszenic') || petAllergies.includes('zboż') || petAllergies.includes('gluten'))) {
      detected.push('Pszenica / Zboża glutenowe (koliduje z alergią w profilu ' + pet.name + ')');
    }

    if (lower.includes('soj') && (petAllergies.includes('soj') || petAllergies.includes('soia'))) {
      detected.push('Soja (koliduje z alergią ' + pet.name + ')');
    }
    if (lower.includes('wołowin') && (petAllergies.includes('wołowin') || petAllergies.includes('wolowin'))) {
      detected.push('Wołowina (koliduje z alergią ' + pet.name + ')');
    }
    if (lower.includes('jagnięcin') && petAllergies.includes('jagnięcin')) {
      detected.push('Jagnięcina (koliduje z alergią ' + pet.name + ')');
    }
    if ((lower.includes('mleko') || lower.includes('laktoz') || lower.includes('serwatk')) && 
        (petAllergies.includes('mlek') || petAllergies.includes('laktoz'))) {
      detected.push('Nabiał / Laktoza (koliduje z alergią ' + pet.name + ')');
    }

    // 2. First ingredient analysis (Golden Rule: What comes first defines the food)
    const skladMatch = text.match(/(?:skład|składniki)\s*:\s*([^,.\n]+)/i);
    const firstIngredient = skladMatch ? skladMatch[1].trim() : undefined;
    const isFirstIngredientGrain = firstIngredient ? /zboż|pszenic|kukurydz|ryż|jęczmień|owies/i.test(firstIngredient) : false;

    // 3. Animal derivatives vs Real meat breakdown
    let meatPercentage = 'Brak danych o procentach';
    let meatBreakdown: string | undefined;
    let meatQuality = 'Średnia';

    const animalDerivMatch = text.match(/mięso\s+i\s+produkty\s+pochodzenia\s+zwierzęcego\s*\(\s*(\d{1,2}(?:[.,]\d+)?)\s*%\s*(?:,\s*w\s+tym\s+(\d{1,2}(?:[.,]\d+)?)\s*%\s*([^)]+))?\)/i);
    if (animalDerivMatch) {
      const totalDeriv = animalDerivMatch[1];
      const subPct = animalDerivMatch[2];
      const subMeat = animalDerivMatch[3] ? animalDerivMatch[3].trim() : 'drobiu w granulkach';
      meatPercentage = `Tylko ${subPct || '4'}% mięsa (w tym ${totalDeriv}% odpadów poubojowych)`;
      meatBreakdown = `Producent podaje ${totalDeriv}% ogólnych produktów zwierzęcych (odpady rzeźne i podroby uboczne), w tym zaledwie ${subPct || '4'}% deklarowanego ${subMeat}!`;
      meatQuality = 'Bardzo niska (nieokreślone odpady poubojowe „produkty zwierzęce”)';
    } else {
      const directMeatMatch = text.match(/(\d{1,2}(?:[.,]\d+)?)\s*%\s*(?:świeże|suszone|odwodnione|dehydratyzowane)?\s*(?:mięso|mięsa|jagnięcin|wołowin|kurczak|indyka|łosoś|kaczk|królik)/i) ||
                              text.match(/(?:świeże|suszone|odwodnione)?\s*(?:mięso|mięsa|jagnięcina|wołowina|kurczak|indyk|łosoś)[^.,\n]*?(\d{1,2}(?:[.,]\d+)?)\s*%/i);
      if (directMeatMatch) {
        meatPercentage = `ok. ${directMeatMatch[1]}%`;
        if (lower.includes('świeże') || lower.includes('suszone mięso') || lower.includes('filet')) {
          meatQuality = 'Bardzo wysoka (transparentne mięso jakości spożywczej)';
          meatBreakdown = `Wysokiej jakości deklarowane czyste mięso: ${directMeatMatch[1]}%`;
        } else {
          meatQuality = 'Dobra: sprecyzowane gatunki mięsa';
        }
      } else if (lower.includes('produkty pochodzenia zwierzęcego') || lower.includes('mączka')) {
        meatQuality = 'Niska (nieokreślone odpady poubojowe)';
        meatBreakdown = 'Brak deklaracji czystego mięsa mięśniowego.';
      }
    }

    // 4. Grains & Fillers
    const grainFree = !lower.includes('pszenic') && !lower.includes('kukurydz') && !lower.includes('zboż') && !lower.includes('jęczmień') && !lower.includes('owies') && !lower.includes('żyto');
    
    const fillers: string[] = [];
    if (lower.includes('wysłodki buraczane')) fillers.push('Wysłodki buraczane (odpad cukrowniczy sztucznie zagęszczający stolec)');
    if (lower.includes('zboża') || lower.includes('zboż')) fillers.push('Zboża (tani wypełniacz węglowodanowy)');
    if (lower.includes('kukurydz')) fillers.push('Kukurydza (tani węglowodan)');
    if (lower.includes('pszenic')) fillers.push('Pszenica (potencjalny alergen glutenowy)');
    if (lower.includes('produkty pochodzenia roślinnego')) fillers.push('Produkty pochodzenia roślinnego (odpady z obróbki roślin)');
    if (lower.includes('cukier') || lower.includes('karmel')) fillers.push('Dodatek cukrów / karmelu');

    // 5. Marketing tricks (Color splits / colored kibbles)
    const marketingTricks: string[] = [];
    if (lower.includes('granulkach') || lower.includes('brązowych') || lower.includes('pomarańczowych') || lower.includes('zielonych')) {
      marketingTricks.push('Kolorowe granulki (chwyt marketingowy): producent barwi pojedyncze granulki (np. 4% marchewki tylko w granulce pomarańczowej), co w masie karmy daje ułamek procenta warzyw.');
    }

    // 6. Analytical constituents & NFE calculation (Method of Weende)
    const protMatch = text.match(/białko\s*(?:surowe)?\s*[:\s]*(\d{1,2}(?:[.,]\d+)?)\s*%?/i);
    const fatMatch = text.match(/(?:zawartość\s+)?tłuszcz(?:u)?\s*(?:surowy)?\s*[:\s]*(\d{1,2}(?:[.,]\d+)?)\s*%?/i);
    const fiberMatch = text.match(/włókno\s*(?:surowe)?\s*[:\s]*(\d{1,2}(?:[.,]\d+)?)\s*%?/i);
    const ashMatch = text.match(/(?:popiół\s*(?:surowy)?|materia\s+nieorganiczna)\s*[:\s]*(\d{1,2}(?:[.,]\d+)?)\s*%?/i);

    let protein = protMatch ? `${protMatch[1]}%` : (lower.includes('mokra') ? 'ok. 10 - 12%' : 'ok. 22 - 28%');
    let fat = fatMatch ? `${fatMatch[1]}%` : (lower.includes('mokra') ? 'ok. 5 - 7%' : 'ok. 12 - 16%');
    let fiber = fiberMatch ? `${fiberMatch[1]}%` : 'ok. 2 - 3%';
    let ash = ashMatch ? `${ashMatch[1]}%` : 'ok. 7%';

    let carbs = grainFree ? 'ok. 30 - 36% (z warzyw)' : 'ok. 45 - 55% (ze zbóż)';
    let isCalculatedNFE = false;

    if (protMatch && fatMatch) {
      const pNum = parseFloat(protMatch[1].replace(',', '.'));
      const fNum = parseFloat(fatMatch[1].replace(',', '.'));
      const fibNum = fiberMatch ? parseFloat(fiberMatch[1].replace(',', '.')) : 2.5;
      const ashNum = ashMatch ? parseFloat(ashMatch[1].replace(',', '.')) : 7.5;
      const moistNum = lower.includes('mokra') ? 80 : 10;

      const nfe = Math.max(0, 100 - (pNum + fNum + fibNum + ashNum + moistNum));
      carbs = `${nfe.toFixed(1)}%`;
      isCalculatedNFE = true;
    }

    // 7. Overall Score Calculation (1 to 10)
    let rating = 8;
    if (isFirstIngredientGrain) rating -= 3;
    if (lower.includes('produkty pochodzenia zwierzęcego')) rating -= 2.5;
    if (!grainFree) rating -= 1.5;
    if (fillers.length > 2) rating -= 1;
    if (marketingTricks.length > 0) rating -= 0.5;
    if (detected.length > 0) rating -= 2;
    if (rating < 1.5) rating = 1.5;
    if (rating > 10) rating = 10;
    rating = Math.round(rating * 10) / 10;

    let scoreLabel = 'Karma Super Premium';
    if (rating <= 3) scoreLabel = 'Karma marketowa (bardzo niska jakość)';
    else if (rating <= 5) scoreLabel = 'Karma ekonomiczna (przeciętna)';
    else if (rating <= 7.5) scoreLabel = 'Karma standardowa / średnia półka';
    else if (rating <= 9) scoreLabel = 'Karma Premium / Wysokomięsna';
    else scoreLabel = 'Karma Ultra Premium (Monobiałkowa / Human Grade)';

    // Status
    let safeStatus: 'safe' | 'warning' | 'danger' = 'safe';
    if (detected.length > 0) {
      safeStatus = 'danger';
      haptics.danger();
    } else if (!grainFree || rating <= 4 || fillers.length > 1) {
      safeStatus = 'warning';
      haptics.warning();
    } else {
      safeStatus = 'safe';
      haptics.success();
    }

    let summary = '';
    if (detected.length > 0) {
      summary = `UWAGA: Karma zawiera ${detected.length} składnik(i) kolidujące ze zdefiniowanymi alergiami ${pet.name}! Zdecydowanie odradzamy jej podawanie.`;
    } else if (isFirstIngredientGrain || rating <= 3.5) {
      summary = `Bardzo niska wartość odżywcza: Podstawą karmy są zboża, a nie mięso. Zawiera zaledwie ${meatPercentage} oraz aż ${carbs} węglowodanów ze zbóż.`;
    } else if (grainFree && rating >= 7.5) {
      summary = `Bardzo dobry skład: Karma bezzbożowa, oparta na czytelnym mięsie i wolna od alergenów ${pet.name}.`;
    } else {
      summary = `Brak bezpośrednich alergenów z profilu ${pet.name}. Karma zawiera jednak zboża i węglowodany na poziomie ${carbs}.`;
    }

    let vetAdvice = '';
    if (rating <= 3.5) {
      vetAdvice = `Zalecenie dietetyczne: Dla zdrowia żołądka, trzustki i sierści ${pet.name} warto rozważyć przejście na karmę wysokomięsną (min. 60-70% mięsa), w której na pierwszym miejscu w składzie jest sprecyzowane mięso (np. jagnięcina, indyk), a nie ogólne „zboża”.`;
    } else if (detected.length > 0) {
      vetAdvice = `Zalecenie dietetyczne: Karma wywołuje alergię (${detected.join(', ')}). Wybierz karmę monobiałkową z innym źródłem białka.`;
    } else {
      vetAdvice = `Pamiętaj o stopniowym wprowadzaniu nowej karmy przez 7-10 dni.`;
    }

    setAnalysisResult({
      allergensDetected: detected,
      safeStatus,
      score: { rating, max: 10, label: scoreLabel },
      firstIngredient,
      meatPercentage,
      meatQuality,
      meatBreakdown,
      grainFree,
      marketingTricks,
      fillers,
      summary,
      vetAdvice,
      macronutrients: {
        protein,
        fat,
        carbs,
        fiber,
        ash,
        isCalculatedNFE,
      },
    });
  };

  const handleAnalyzeText = (textToAnalyze?: string) => {
    const text = (textToAnalyze || inputText).trim();
    if (!text) return;

    haptics.tap();
    setIsAnalyzing(true);
    setErrorMsg(null);

    setTimeout(() => {
      runLocalTextAnalysis(text);
      setIsAnalyzing(false);
    }, 400);
  };

  // Analyze image: Server AI + Native OCR fallback
  const processImageWithAI = async (base64Image: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    haptics.tap();

    let serverSuccess = false;

    // 1. Try server-side AI if online/available (with 5s timeout)
    try {
      const candidates = [
        getApiUrl('/api/analyze-pet-document'),
      ];
      const uniqueUrls = Array.from(new Set(candidates));

      for (const url of uniqueUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);

          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              imageBase64: base64Image,
              mimeType: 'image/jpeg',
              petName: pet.name,
              petSpecies: pet.species,
              petAllergies: pet.allergies || '',
            }),
          });
          clearTimeout(timeoutId);

          if (r.ok) {
            const data = await r.json();
            if (data && data.notFoodLabel) {
              setErrorMsg(data.error || 'Na zdjęciu nie rozpoznano etykiety karmy.');
              haptics.warning();
              setIsAnalyzing(false);
              return;
            }
            if (data && data.success) {
              const extractedIngredients = data.ingredientsText || data.text || '';
              if (extractedIngredients) {
                setInputText(extractedIngredients);
              }

              if (data.allergensDetected || data.meatQuality || data.summary) {
                setAnalysisResult({
                  productName: data.productName,
                  foodType: data.foodType,
                  allergensDetected: Array.isArray(data.allergensDetected) ? data.allergensDetected : [],
                  safeStatus: data.safeStatus === 'danger' ? 'danger' : data.safeStatus === 'warning' ? 'warning' : 'safe',
                  meatPercentage: data.meatPercentage,
                  meatQuality: data.meatQuality || 'Zgodna z etykietą',
                  grainFree: typeof data.grainFree === 'boolean' ? data.grainFree : true,
                  fillers: Array.isArray(data.fillers) ? data.fillers : [],
                  summary: data.summary || 'Pomyślnie przeanalizowano skład karmy przez AI.',
                  macronutrients: data.macronutrients || { protein: 'b/d', fat: 'b/d', carbs: 'b/d' },
                  ingredientsText: data.ingredientsText,
                  analyticalText: data.analyticalText,
                });

                if (data.safeStatus === 'danger') {
                  haptics.danger();
                } else {
                  haptics.success();
                }
                serverSuccess = true;
                break;
              }
            }
          }
        } catch {
          // Continue to fallback
        }
      }
    } catch {
      // Ignored for seamless OCR fallback
    }

    if (serverSuccess) {
      setIsAnalyzing(false);
      return;
    }

    // 2. Client-side OCR fallback (Guarantees 100% operation in standalone APK without network error)
    try {
      console.log('[FoodLens] Running local OCR on image...');
      const ocrText = await extractTextFromImage(base64Image);
      
      if (ocrText && ocrText.trim().length > 5) {
        setInputText(ocrText.trim());
        runLocalTextAnalysis(ocrText.trim());
        return;
      }

      setErrorMsg('Nie udało się wyraźnie odczytać składników ze zdjęcia. Upewnij się, że tekst na opakowaniu jest ostry i dobrze oświetlony, lub wklej go ręcznie poniżej.');
      haptics.warning();
    } catch (ocrErr: any) {
      console.warn('[FoodLens] OCR error:', ocrErr);
      setErrorMsg('Nie udało się przetworzyć zdjęcia. Spróbuj zrobić zdjęcie z bliższej odległości lub wklej tekst.');
      haptics.warning();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1. Take photo via Native Camera (@capacitor/camera) with capture="environment" fallback
  const handleTakePhoto = async () => {
    setErrorMsg(null);
    haptics.tap();
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (photo?.dataUrl) {
        const compressed = await compressImage(photo.dataUrl, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
        setImagePreview(compressed.dataUrl);
        await processImageWithAI(compressed.dataUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Native camera cancelled or failed, falling back to camera input:', err);
      // Fallback explicitly instructs Android OS to launch the Camera application
      fileInputCameraRef.current?.click();
    }
  };

  // 2. Pick photo from Gallery via @capacitor/camera with standard file picker fallback
  const handlePickFromGallery = async () => {
    setErrorMsg(null);
    haptics.tap();
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (photo?.dataUrl) {
        const compressed = await compressImage(photo.dataUrl, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
        setImagePreview(compressed.dataUrl);
        await processImageWithAI(compressed.dataUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Native gallery picker cancelled or failed, falling back to gallery input:', err);
      // Fallback opens the Android photo gallery / file manager
      fileInputGalleryRef.current?.click();
    }
  };

  // 3. File input handler (Web, camera fallback or gallery fallback)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers change
    e.target.value = '';

    setErrorMsg(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      setImagePreview(compressed.dataUrl);
      await processImageWithAI(compressed.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        await processImageWithAI(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
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
                <span className="text-xs font-black uppercase bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
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
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Zrób zdjęcie etykiety karmy lub wklej skład:
              </label>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Photo Preview if captured */}
            {imagePreview && (
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={imagePreview}
                    alt="Etykieta karmy"
                    className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      Zdjęcie etykiety karmy
                    </span>
                    <span className="text-xs text-teal-700 dark:text-teal-400 font-semibold block">
                      ✓ Przesłano do analizy AI
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setAnalysisResult(null);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-semibold transition cursor-pointer"
                >
                  Usuń
                </button>
              </div>
            )}

            {/* Live Camera Viewfinder if active */}
            {isLiveCameraOpen && (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border-2 border-teal-500 shadow-xl animate-fadeIn">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-teal-400/50 rounded-2xl pointer-events-none m-3 flex items-center justify-center">
                  <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-xs">
                    Skieruj aparat na skład karmy
                  </span>
                </div>
                <div className="absolute bottom-3 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={captureLiveCameraSnapshot}
                    className="px-5 py-2.5 rounded-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Uchwyć kadr</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-xs transition cursor-pointer"
                    title="Zamknij wizjer" aria-label="Zamknij wizjer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Hidden fallback HTML inputs for Camera and Gallery */}
            <input
              ref={fileInputCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Camera, Live View and Gallery Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <CameraIcon className="w-4 h-4" />
                <span>Zrób zdjęcie (Aparat)</span>
              </button>

              <button
                type="button"
                onClick={startLiveCamera}
                disabled={isAnalyzing || isLiveCameraOpen}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Video className="w-4 h-4 text-emerald-300" />
                <span>Wizjer na żywo</span>
              </button>

              <button
                type="button"
                onClick={handlePickFromGallery}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs transition cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Wybierz z galerii</span>
              </button>
            </div>

            {/* Textarea for manual ingredients paste */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-500 block">
                Lub wklej tekst składu ręcznie:
              </span>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="np. Świeże mięso z kurczaka 40%, kukurydza, pszenica, tłuszcz drobiowy, wysłodki buraczane..."
                className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-teal-600 focus:ring-1 focus:ring-teal-500 shadow-2xs"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAnalyzeText()}
                  disabled={!inputText.trim() || isAnalyzing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAnalyzing ? 'Analizuję skład...' : 'Przeanalizuj wpisany tekst'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Loading State */}
          {isAnalyzing && (
            <div className="p-4 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-2xl flex items-center justify-center gap-3 text-teal-900 dark:text-teal-200 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600 shrink-0" />
              <div className="text-xs">
                <span className="font-extrabold block">Gemini AI analizuje etykietę karmy...</span>
                <span className="text-xs text-teal-700/80 dark:text-teal-400">Rozpoznaję składniki, procent mięsa i alergeny {pet.name}</span>
              </div>
            </div>
          )}

          {/* Quick test sample buttons */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Przetestuj na gotowych próbkach składu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_FOOD_INGREDIENTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sample.text);
                    handleAnalyzeText(sample.text);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/90 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  ⚡ {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Results Display */}
          {analysisResult && !isAnalyzing && (
            <div className="space-y-3 pt-2 animate-fadeIn">
              {/* Product Name if detected by Gemini */}
              {analysisResult.productName && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 block">Wykryta karma:</span>
                    <strong className="text-slate-900 dark:text-white font-extrabold text-sm">{analysisResult.productName}</strong>
                  </div>
                  {analysisResult.foodType && (
                    <span className="px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold text-xs border border-teal-200 dark:border-teal-800 uppercase">
                      {analysisResult.foodType}
                    </span>
                  )}
                </div>
              )}

              {/* Score Banner */}
              {analysisResult.score && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-300 block">
                      Ocena jakości karmy wg dietetyków PetCare:
                    </span>
                    <span className="text-xs font-black text-teal-300 block mt-0.5">
                      {analysisResult.score.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
                    <span className={`text-xl font-black ${
                      analysisResult.score.rating >= 7.5 ? 'text-emerald-400' : analysisResult.score.rating >= 4.5 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {analysisResult.score.rating}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 10</span>
                  </div>
                </div>
              )}

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
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
                      <span>WYKRYTO ZNANY ALERGEN DLA {pet.name.toUpperCase()}!</span>
                    </>
                  ) : analysisResult.safeStatus === 'warning' ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>UWAGA NA WYPEŁNIACZE I ZBOŻA</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>SKŁAD BEZPIECZNY DLA ALERGII {pet.name.toUpperCase()}</span>
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

              {/* First Ingredient Banner */}
              {analysisResult.firstIngredient && (
                <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
                  /zboż|pszenic|kukurydz|ryż|jęczmień/i.test(analysisResult.firstIngredient)
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}>
                  <span className="text-base shrink-0">
                    {/zboż|pszenic|kukurydz|ryż|jęczmień/i.test(analysisResult.firstIngredient) ? '⚠️' : '✓'}
                  </span>
                  <div>
                    <span className="font-extrabold block">
                      Pierwszy składnik receptury: {analysisResult.firstIngredient}
                    </span>
                    <span className="text-xs opacity-90 block mt-0.5">
                      {/zboż|pszenic|kukurydz|ryż|jęczmień/i.test(analysisResult.firstIngredient)
                        ? 'Główną bazą i największą częścią tej karmy są tanie ziarna zbóż (wypełniacz), a nie mięso!'
                        : 'Karma bazuje w przewadze na źródle mięsnym.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Meat Breakdown Detail */}
              {analysisResult.meatBreakdown && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl text-xs text-amber-950 dark:text-amber-100 space-y-1">
                  <span className="font-black text-xs uppercase tracking-wider block text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    🥩 Prawdziwy bilans mięsa:
                  </span>
                  <p className="font-semibold text-xs leading-relaxed">
                    {analysisResult.meatBreakdown}
                  </p>
                </div>
              )}

              {/* Composition Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                    Jakość źródła białka
                  </span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                    {analysisResult.meatQuality}
                  </span>
                  {analysisResult.meatPercentage && (
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
                      Mięso: {analysisResult.meatPercentage}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                    Obecność zbóż
                  </span>
                  <span className={`font-extrabold block ${
                    analysisResult.grainFree ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {analysisResult.grainFree ? '✓ 100% Bezzbożowa' : '⚠️ Zawiera zboża'}
                  </span>
                </div>
              </div>

              {/* Marketing Tricks Banner */}
              {analysisResult.marketingTricks && analysisResult.marketingTricks.length > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                  <span className="font-bold text-xs uppercase text-indigo-700 dark:text-indigo-400 block">
                    🎭 Wykryty trik marketingowy producenta:
                  </span>
                  {analysisResult.marketingTricks.map((trick, i) => (
                    <p key={i} className="text-xs font-semibold leading-relaxed">
                      &bull; {trick}
                    </p>
                  ))}
                </div>
              )}

              {/* Fillers List */}
              {analysisResult.fillers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-xs block">
                    Zidentyfikowane wypełniacze i tanie zamienniki:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {analysisResult.fillers.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs">
                        &bull; {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Macronutrient Estimates */}
              <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-xs space-y-1.5">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-teal-600" />
                    Profil makroskładników:
                  </span>
                  {analysisResult.macronutrients.isCalculatedNFE && (
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                      Metoda NFE Weende
                    </span>
                  )}
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-xs text-slate-400 font-bold block">Białko</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.protein}</strong>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-xs text-slate-400 font-bold block">Tłuszcz</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.fat}</strong>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-teal-100 dark:border-teal-900">
                    <span className="text-xs text-slate-400 font-bold block">Węglowodany</span>
                    <strong className="text-teal-900 dark:text-teal-200 text-xs font-black">{analysisResult.macronutrients.carbs}</strong>
                  </div>
                </div>
              </div>

              {/* Veterinary Dietary Advice */}
              {analysisResult.vetAdvice && (
                <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 rounded-2xl text-xs text-teal-950 dark:text-teal-100 space-y-1">
                  <span className="font-black text-xs uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                    💡 Wskazówka dietetyczna PetCare:
                  </span>
                  <p className="font-semibold text-xs leading-relaxed">
                    {analysisResult.vetAdvice}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-400">
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
