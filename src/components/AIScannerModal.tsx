import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera as CameraIcon, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Pill, 
  FileText, 
  X, 
  Loader2, 
  Plus, 
  FileSearch,
  ArrowRight,
  RefreshCw,
  Video
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Pet, Medication, MedicalExam } from '../types/pet';
import { storage } from '../services/storage';
import { getApiUrl } from '../services/cloudSyncService';
import { extractTextFromImage, analyzeExtractedMedicalText, ExtractedMedicalData } from '../services/ocrMedicalService';

interface AIScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onDataAdded: () => void;
}

export const AIScannerModal: React.FC<AIScannerModalProps> = ({
  isOpen,
  onClose,
  pet,
  onDataAdded,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEnhanceEnabled, setIsEnhanceEnabled] = useState(true);
  
  // In-app live camera stream support
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      // Fallback to system camera
      handleTakePhoto();
    }
  };

  const captureLiveCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImagePreview(dataUrl);
    stopLiveCamera();
  };

  if (!isOpen) return null;

  // 1. Native Camera Capture via @capacitor/camera
  const handleTakePhoto = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedData(null);

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera, // Forces native camera
      });
      if (photo?.dataUrl) {
        setImagePreview(photo.dataUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Capacitor camera error, using HTML file input:', err);
      fileInputCameraRef.current?.click();
    }
  };

  // 2. Native Gallery Picker via @capacitor/camera
  const handlePickFromGallery = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedData(null);

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos, // Gallery
      });
      if (photo?.dataUrl) {
        setImagePreview(photo.dataUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Capacitor gallery error, using HTML file input:', err);
      fileInputGalleryRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // Helper: Enhances contrast and strengthens faint handwriting / faded thermal ink
  const enhanceImageContrast = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          // Adaptive contrast stretching and ink darkening:
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            let newGray = gray;
            if (gray < 165) {
              // Faint handwriting or faded dot matrix: darken ink
              newGray = Math.max(0, gray * 0.72 - 18);
            } else if (gray > 180) {
              // Whitewash grayish paper background for high contrast
              newGray = Math.min(255, gray * 1.12 + 15);
            }
            d[i] = Math.round((r * 0.25) + (newGray * 0.75));
            d[i + 1] = Math.round((g * 0.25) + (newGray * 0.75));
            d[i + 2] = Math.round((b * 0.25) + (newGray * 0.75));
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.94));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleScan = async () => {
    if (!imagePreview) return;

    setIsScanning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedData(null);

    try {
      // 0. Preprocess image if enhancement is enabled
      const imageToSend = isEnhanceEnabled
        ? await enhanceImageContrast(imagePreview)
        : imagePreview;

      const apiUrl = getApiUrl('/api/scan-medical');
      let extracted: ExtractedMedicalData | null = null;

      // 1. Attempt server AI call with 35s timeout for complex handwriting
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: imageToSend,
            petName: pet.name,
            petSpecies: pet.species,
          }),
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.success && data?.extracted) {
            extracted = data.extracted;
          }
        }
      } catch (networkOrAuthErr) {
        console.warn('Serwer AI w chmurze niedostępny (np. aplikacja mobilna APK), uruchamiam analizator lokalny:', networkOrAuthErr);
      }

      // 2. If server was unreachable or returned auth/HTML redirect (typical for standalone APK),
      // execute client-side OCR & intelligent medical text analysis
      if (!extracted) {
        const rawText = await extractTextFromImage(imageToSend);
        extracted = analyzeExtractedMedicalText(rawText, pet.name, pet.species);
      }

      setExtractedData(extracted);

      const hasMeds = Array.isArray(extracted.medications) && extracted.medications.length > 0;
      const hasExams = Array.isArray(extracted.examParameters) && extracted.examParameters.length > 0;

      if (!extracted.isValidMedicalDocument || (!hasMeds && !hasExams)) {
        setErrorMsg(extracted.summary || 'Na przesłanym zdjęciu nie wykryto leków ani zaleceń weterynaryjnych (to nie jest recepta ani opakowanie leku).');
      } else {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
        setSuccessMsg('Dokument został pomyślnie zinterpretowany!');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg(err.message || 'Wystąpił błąd podczas analizy zdjęcia. Upewnij się, że zdjęcie jest ostre i czytelne.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportMedications = () => {
    if (!extractedData?.medications || extractedData.medications.length === 0) return;

    const currentMeds = storage.getMedications(pet.id);
    const newItems: Medication[] = extractedData.medications.map((m: any, index: number) => ({
      id: `med-ai-${Date.now()}-${index}`,
      petId: pet.id,
      name: m.name || 'Lek z recepty',
      form: m.form || 'tablet',
      dosage: m.dosage || '1 dawka',
      timesOfDay: [
        { id: `t1-${index}`, label: 'Rano', time: '08:00', amount: m.dosage || '1 tabl.' },
        { id: `t2-${index}`, label: 'Wieczór', time: '20:00', amount: m.dosage || '1 tabl.' },
      ],
      instructions: m.instructions || 'Zgodnie z zaleceniem lekarza',
      startDate: new Date().toISOString().slice(0, 10),
      isChronic: !!m.isChronic,
      isActive: true,
      notes: `Zeskanowano przez AI: ${extractedData.title || ''}`,
    }));

    storage.saveMedications([...storage.getMedications().filter(m => m.petId !== pet.id), ...currentMeds, ...newItems]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setSuccessMsg(`Dodano ${newItems.length} lek(ów) do apteczki i planu ${pet.name}!`);
    onDataAdded();
  };

  const handleImportExam = () => {
    if (!extractedData?.examParameters || extractedData.examParameters.length === 0) return;

    const currentExams = storage.getExams(pet.id);
    const newExam: MedicalExam = {
      id: `exam-ai-${Date.now()}`,
      petId: pet.id,
      title: extractedData.title || 'Badanie laboratoryjne krwi (Skaner AI)',
      category: 'blood',
      date: new Date().toISOString().slice(0, 10),
      status: extractedData.examParameters.some((p: any) => p.status === 'abnormal') ? 'abnormal' : 'normal',
      summary: extractedData.summary || 'Wyniki wyodrębnione automatycznie ze zdjęcia.',
      keyParameters: extractedData.examParameters.map((p: any) => ({
        name: p.name,
        value: p.value,
        unit: p.unit,
        refRange: p.refRange,
        isFlagged: p.status === 'abnormal',
      })),
      scans: imagePreview ? [{
        id: `scan-${Date.now()}`,
        url: imagePreview,
        title: 'Skan dokumentu badań',
        date: new Date().toISOString().slice(0, 10),
      }] : [],
    };

    storage.saveExams([...storage.getExams().filter(e => e.petId !== pet.id), ...currentExams, newExam]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setSuccessMsg(`Zapisano badanie z ${newExam.keyParameters?.length} parametrami w historii badań!`);
    onDataAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      {/* Hidden fallback HTML inputs */}
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Inteligentny Skaner Medyczny AI
              </h2>
              <p className="text-xs text-teal-200/80">
                Skanuj recepty, leki, zalecenia weterynaryjne i wyniki krwi dla {pet.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopLiveCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 flex-1">
          {/* Live Camera Viewfinder (if open) */}
          {isLiveCameraOpen && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-4/3 flex items-center justify-center border-2 border-teal-500 shadow-xl">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-dashed border-teal-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="bg-black/60 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-xs">
                  Skieruj na receptę lub pudełko leku
                </span>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={stopLiveCamera}
                  className="px-4 py-2 bg-slate-800/80 text-white rounded-xl text-xs font-semibold backdrop-blur-sm cursor-pointer hover:bg-slate-700"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={captureLiveCameraSnapshot}
                  className="w-14 h-14 rounded-full bg-white border-4 border-teal-500 shadow-xl flex items-center justify-center text-teal-600 hover:scale-105 active:scale-95 transition cursor-pointer"
                  title="Zrób zdjęcie"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-600"></div>
                </button>
              </div>
            </div>
          )}

          {/* Upload Area when no image is selected and live camera is off */}
          {!imagePreview && !isLiveCameraOpen && (
            <div className="border-2 border-dashed border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-teal-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
                <CameraIcon className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Zrób zdjęcie aparatem lub wybierz z galerii
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Skieruj aparat na receptę z lecznicy, etykietę butelki z lekiem lub kartę z wynikami morfologii.
                </p>
              </div>

              {/* 3 Explicit Direct Buttons: Camera, Live Viewfinder, Gallery */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95"
                >
                  <CameraIcon className="w-4 h-4" />
                  <span>Otwórz aparat (Zdjęcie)</span>
                </button>

                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition active:scale-95"
                >
                  <Video className="w-4 h-4 text-teal-400" />
                  <span>Wizjer w oknie (Na żywo)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePickFromGallery}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition active:scale-95"
                >
                  <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Wybierz z galerii</span>
                </button>
              </div>
            </div>
          )}

          {/* Image Preview Card */}
          {imagePreview && !isLiveCameraOpen && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video sm:aspect-2/1 max-h-56 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Zeskanowany dokument"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setExtractedData(null);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4" />
                  Zmień zdjęcie
                </button>
              </div>

              {/* Handwriting and Faded Print Filter Toggle */}
              {!extractedData && (
                <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Filtr AI: Wyostrzanie pisma ręcznego i bladego druku
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Zwiększa kontrast dla trudnych recept, niewyraźnych wydruków i papieru termicznego
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEnhanceEnabled(!isEnhanceEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                      isEnhanceEnabled ? 'bg-teal-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                  </button>
                </div>
              )}

              {/* Action Button */}
              {!extractedData && (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2.5 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                      <span>Rozpoznawanie pisma ręcznego i bladej czcionki przez AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Przeanalizuj i odczytaj receptę / lek</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Results Display */}
          {extractedData && (
            <div className="space-y-4 animate-fadeIn">
              {(!extractedData.isValidMedicalDocument || ((!extractedData.medications || extractedData.medications.length === 0) && (!extractedData.examParameters || extractedData.examParameters.length === 0))) ? (
                <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    Brak leków i dokumentacji weterynaryjnej
                  </div>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                    {extractedData.summary || 'Przesłane zdjęcie nie przedstawia recepty weterynaryjnej, opakowania leku ani karty informacyjnej z lecznicy. Nie wykryto żadnych leków ani zaleceń weterynaryjnych.'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    💡 Wskazówka: Zrób ostre zdjęcie z bliska przedstawiające etykietę/opakowanie leku lub receptę z zaleceniami lekarza weterynarii.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/50 px-2 py-0.5 rounded-md">
                      Rozpoznany dokument: {extractedData.type || 'Medyczny'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{extractedData.title || 'Karta wizyty'}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{extractedData.summary}</p>
                </div>
              )}

              {/* Extracted Medications */}
              {extractedData.medications && extractedData.medications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      Wykryte Leki ({extractedData.medications.length})
                    </h5>
                    <button
                      onClick={handleImportMedications}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Dodaj leki do planu {pet.name}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {extractedData.medications.map((med: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900 dark:text-white text-sm">{med.name}</strong>
                          <span className="font-bold text-teal-700 dark:text-teal-300">{med.dosage}</span>
                        </div>
                        {med.instructions && (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">{med.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Blood Exam Parameters */}
              {extractedData.examParameters && extractedData.examParameters.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <FileSearch className="w-4 h-4 text-blue-600" />
                      Wykryte Parametry Badań ({extractedData.examParameters.length})
                    </h5>
                    <button
                      onClick={handleImportExam}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Zapisz badanie do profilu
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {extractedData.examParameters.map((param: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{param.name}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className={`text-sm ${param.status === 'abnormal' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                            {param.value}
                          </strong>
                          <span className="text-[10px] text-slate-400">{param.unit}</span>
                        </div>
                        {param.refRange && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">Norma: {param.refRange}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.doctorNotes && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                  <strong className="text-amber-900 dark:text-amber-200 block font-bold">Zalecenia lekarza:</strong>
                  <p className="text-amber-800 dark:text-amber-300">{extractedData.doctorNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
