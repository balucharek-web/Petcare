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
import { compressImage } from '../utils/imageCompressor';

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
        const compressed = await compressImage(photo.dataUrl, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
        setImagePreview(compressed.dataUrl);
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
        const compressed = await compressImage(photo.dataUrl, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
        setImagePreview(compressed.dataUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Capacitor gallery error, using HTML file input:', err);
      fileInputGalleryRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setExtractedData(null);

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      setImagePreview(compressed.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const [deepDecipherMode, setDeepDecipherMode] = useState(true);
  const [showRawDetectedText, setShowRawDetectedText] = useState(false);

  // Rotate photo 90 degrees clockwise via HTML5 canvas
  const handleRotateImage = () => {
    if (!imagePreview) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight || img.height;
      canvas.height = img.naturalWidth || img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imagePreview;
  };

  const [filterPreset, setFilterPreset] = useState<'handwriting' | 'thermal' | 'shadows' | 'original'>('handwriting');
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);

  // Helper: Enhances contrast, handwriting strokes, or thermal paper ink according to preset
  const enhanceImageWithPreset = (dataUrl: string, preset: 'handwriting' | 'thermal' | 'shadows' | 'original'): Promise<string> => {
    if (preset === 'original') return Promise.resolve(dataUrl);

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

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            let newGray = gray;

            if (preset === 'handwriting') {
              // Deep handwriting: darken ink strokes, whiten paper background
              if (gray < 165) {
                newGray = Math.max(0, gray * 0.65 - 20); // intensify pen ink
              } else if (gray > 175) {
                newGray = Math.min(255, gray * 1.15 + 18); // bleach background paper
              }
            } else if (preset === 'thermal') {
              // Thermal receipt & faded dot matrix: steep binarization threshold
              if (gray < 185) {
                newGray = Math.max(0, gray * 0.5 - 25); // heavily darken faded dot matrix
              } else {
                newGray = 255;
              }
            } else if (preset === 'shadows') {
              // Shadow removal: brighten dark shaded zones while preserving ink
              if (gray < 90) {
                newGray = Math.max(0, gray * 0.7); // keep ink dark
              } else {
                newGray = Math.min(255, Math.pow(gray / 255, 0.7) * 255 + 20); // lift shadows
              }
            }

            d[i] = Math.round((r * 0.2) + (newGray * 0.8));
            d[i + 1] = Math.round((g * 0.2) + (newGray * 0.8));
            d[i + 2] = Math.round((b * 0.2) + (newGray * 0.8));
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
      // 0. Preprocess image with chosen preset
      const imageToSend = isEnhanceEnabled
        ? await enhanceImageWithPreset(imagePreview, filterPreset)
        : imagePreview;

      const apiUrl = getApiUrl('/api/scan-medical');
      let extracted: ExtractedMedicalData | null = null;

      // 1. Attempt server AI call with 45s timeout for complex handwriting
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: imageToSend,
            petName: pet.name,
            petSpecies: pet.species,
            petWeightKg: pet.weightKg,
            deepDecipherMode,
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
    const newItems: Medication[] = extractedData.medications.map((m: any, index: number) => {
      const suggestedTimes = Array.isArray(m.suggestedHours) && m.suggestedHours.length > 0
        ? m.suggestedHours.map((h: string, hi: number) => ({
            id: `t-${index}-${hi}`,
            label: h < '12:00' ? 'Rano' : h < '17:00' ? 'Popołudnie' : 'Wieczór',
            time: h,
            amount: m.dosage || '1 tabl.',
          }))
        : [
            { id: `t1-${index}`, label: 'Rano', time: '08:00', amount: m.dosage || '1 tabl.' },
            { id: `t2-${index}`, label: 'Wieczór', time: '20:00', amount: m.dosage || '1 tabl.' },
          ];

      return {
        id: `med-ai-${Date.now()}-${index}`,
        petId: pet.id,
        name: m.name || 'Lek z recepty',
        form: m.form || 'tablet',
        dosage: m.dosage || '1 dawka',
        timesOfDay: suggestedTimes,
        instructions: m.instructions || 'Zgodnie z zaleceniem lekarza',
        startDate: new Date().toISOString().slice(0, 10),
        isChronic: !!m.isChronic,
        isActive: true,
        notes: `Zeskanowano przez AI: ${extractedData.title || ''}`,
      };
    });

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
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={handleRotateImage}
                    title="Obróć zdjęcie o 90 stopni (jeśli aparat zrobił je bokiem lub do góry nogami)"
                    className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Obróć 90°</span>
                  </button>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setExtractedData(null);
                    }}
                    className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <X className="w-4 h-4" />
                    <span>Zmień</span>
                  </button>
                </div>
              </div>

              {/* Advanced Handwriting & Faint Print Enhancement Controls */}
              {!extractedData && (
                <div className="space-y-2.5">
                  {/* Filter presets tabs */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        Optymalizacja obrazu do trudnych dokumentów:
                      </span>
                      <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold uppercase">
                        AI Pre-processing
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'handwriting', label: '✍️ Pismo odręczne', desc: 'Wyostrzenie tuszu' },
                        { id: 'thermal', label: '🧾 Druk termiczny', desc: 'Wyblakły paragon' },
                        { id: 'shadows', label: '☀️ Cienie / Kąt', desc: 'Wyrównanie światła' },
                        { id: 'original', label: '📷 Bez filtra', desc: 'Oryginalne foto' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFilterPreset(preset.id as any)}
                          className={`p-2 rounded-xl text-left transition border cursor-pointer ${
                            filterPreset === preset.id
                              ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-xs'
                              : 'bg-white dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="text-xs leading-tight font-semibold">{preset.label}</div>
                          <div className={`text-[10px] ${filterPreset === preset.id ? 'text-teal-100' : 'text-slate-400'}`}>
                            {preset.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileSearch className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Rozszyfrowywanie bazgrołów lekarskich (Deep OCR)</span>
                          <span className="text-[9px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.2 rounded font-bold uppercase">
                            Aktywny
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Automatycznie uzupełnia skróty (Rp., D.S., co 12h, 1/2 tab.) i dopasowuje dawki do wagi {pet.name} ({pet.weightKg} kg)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeepDecipherMode(!deepDecipherMode)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                        deepDecipherMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                    </button>
                  </div>
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
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-900/50 px-2 py-0.5 rounded-md">
                      Rozpoznany dokument: {extractedData.type || 'Medyczny'}
                    </span>
                    {extractedData.confidence && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        extractedData.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : extractedData.confidence === 'medium'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        <span>Dokładność AI: {extractedData.confidence === 'high' ? 'Wysoka (100% czytelne)' : extractedData.confidence === 'medium' ? 'Zrekonstruowano z pisma ręcznego' : 'Szacunkowa'}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{extractedData.title || 'Karta wizyty'}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{extractedData.summary}</p>

                  {extractedData.detectedRawText && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setShowRawDetectedText(!showRawDetectedText)}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showRawDetectedText ? '▾ Ukryj odczytany tekst lekarski' : '▸ Pokaż odczytany surowy tekst lekarski (OCR)'}</span>
                      </button>
                      {showRawDetectedText && (
                        <div className="mt-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {extractedData.detectedRawText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Medications */}
              {extractedData.medications && extractedData.medications.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      Wykryte Leki ({extractedData.medications.length})
                    </h5>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newMed = {
                            name: 'Nowy lek',
                            dosage: '1 tabl.',
                            instructions: '1x dziennie',
                            form: 'tablet',
                            suggestedHours: ['08:00', '20:00'],
                            isChronic: false,
                          };
                          const list = extractedData.medications || [];
                          setExtractedData({ ...extractedData, medications: [...list, newMed] });
                          setEditingMedIndex(list.length);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Dodaj wiersz</span>
                      </button>
                      <button
                        onClick={handleImportMedications}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Dodaj leki do planu {pet.name}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {extractedData.medications.map((med: any, idx: number) => {
                      const isEditing = editingMedIndex === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 text-xs space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Nazwa leku</label>
                                <input
                                  type="text"
                                  value={med.name}
                                  onChange={(e) => {
                                    const updated = [...extractedData.medications];
                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                    setExtractedData({ ...extractedData, medications: updated });
                                  }}
                                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Dawkowanie</label>
                                <input
                                  type="text"
                                  value={med.dosage}
                                  onChange={(e) => {
                                    const updated = [...extractedData.medications];
                                    updated[idx] = { ...updated[idx], dosage: e.target.value };
                                    setExtractedData({ ...extractedData, medications: updated });
                                  }}
                                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">Zalecenia i sposób podania</label>
                              <input
                                type="text"
                                value={med.instructions || ''}
                                onChange={(e) => {
                                  const updated = [...extractedData.medications];
                                  updated[idx] = { ...updated[idx], instructions: e.target.value };
                                  setExtractedData({ ...extractedData, medications: updated });
                                }}
                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = extractedData.medications.filter((_: any, i: number) => i !== idx);
                                  setExtractedData({ ...extractedData, medications: updated });
                                  setEditingMedIndex(null);
                                }}
                                className="px-2.5 py-1 text-[11px] text-rose-600 font-bold hover:underline"
                              >
                                Usuń
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMedIndex(null)}
                                className="px-3 py-1 bg-teal-600 text-white rounded-lg text-[11px] font-bold shadow-xs hover:bg-teal-500"
                              >
                                Gotowe
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <strong className="text-slate-900 dark:text-white text-sm">{med.name}</strong>
                              <span className="ml-2 font-bold text-teal-700 dark:text-teal-300">{med.dosage}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingMedIndex(idx)}
                                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                              >
                                Popraw
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = extractedData.medications.filter((_: any, i: number) => i !== idx);
                                  setExtractedData({ ...extractedData, medications: updated });
                                }}
                                className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Usuń ten lek z listy"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {med.instructions && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px]">{med.instructions}</p>
                          )}
                        </div>
                      );
                    })}
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
