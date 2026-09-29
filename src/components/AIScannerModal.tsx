import React, { useState } from 'react';
import { 
  Camera, 
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
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pet, Medication, MedicalExam, TimeOfDayKey } from '../types/pet';
import { storage } from '../services/storage';

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

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleScan = async () => {
    if (!imagePreview) return;

    setIsScanning(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/scan-medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          petName: pet.name,
          petSpecies: pet.species,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nie udało się przetworzyć obrazu.');
      }

      setExtractedData(data.extracted);
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg(err.message || 'Wystąpił błąd podczas analizy obrazu. Spróbuj ponownie.');
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
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Inteligentny Skaner Medyczny AI
              </h2>
              <p className="text-xs text-teal-200/80">
                Skanuj zalecenia weterynaryjne, recepty, etykiety leków i wyniki krwi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
          {/* Upload Area */}
          {!imagePreview ? (
            <div className="border-2 border-dashed border-teal-200 bg-teal-50/40 rounded-3xl p-6 sm:p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-teal-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Zrób zdjęcie lub wgraj plik
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Skieruj aparat na receptę z lecznicy, etykietę butelki z lekiem lub kartę z wynikami morfologii.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition active:scale-95">
                  <Camera className="w-4 h-4" />
                  <span>Aparat / Galeria</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                <label className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition active:scale-95">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Wybierz plik</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview Card */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video sm:aspect-2/1 max-h-56 flex items-center justify-center">
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
                  className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Zmień zdjęcie
                </button>
              </div>

              {/* Action Button */}
              {!extractedData && (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2.5 transition active:scale-98 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analizowanie dokumentu przez Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Przeanalizuj i odczytaj dane medyczne</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Results Display */}
          {extractedData && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                    Rozpoznany dokument: {extractedData.type || 'Medyczny'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">{extractedData.title || 'Karta wizyty'}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{extractedData.summary}</p>
              </div>

              {/* Extracted Medications */}
              {extractedData.medications && extractedData.medications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      Wykryte Leki ({extractedData.medications.length})
                    </h5>
                    <button
                      onClick={handleImportMedications}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Dodaj leki do planu {pet.name}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {extractedData.medications.map((med: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900 text-sm">{med.name}</strong>
                          <span className="font-bold text-teal-700">{med.dosage}</span>
                        </div>
                        {med.instructions && (
                          <p className="text-slate-500 text-[11px]">{med.instructions}</p>
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
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <FileSearch className="w-4 h-4 text-blue-600" />
                      Wykryte Parametry Badań ({extractedData.examParameters.length})
                    </h5>
                    <button
                      onClick={handleImportExam}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Zapisz badanie do profilu
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {extractedData.examParameters.map((param: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                        <span className="text-[10px] text-slate-500 block truncate">{param.name}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <strong className={`text-sm ${param.status === 'abnormal' ? 'text-rose-600' : 'text-slate-900'}`}>
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
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <strong className="text-amber-900 block font-bold">Zalecenia lekarza:</strong>
                  <p className="text-amber-800">{extractedData.doctorNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
