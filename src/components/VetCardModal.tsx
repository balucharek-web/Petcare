import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileHeart, 
  AlertTriangle, 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  Phone, 
  QrCode, 
  Printer, 
  Calendar, 
  Pill, 
  Syringe, 
  Stethoscope, 
  Activity,
  HeartPulse,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';
import { Pet, Medication, Vaccination, MedicalCondition, MedicalExam } from '../types/pet';
import { downloadPetMedicalReportPdf, triggerPrint } from '../services/pdfReportGenerator';

interface VetCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  medications: Medication[];
  vaccinations: Vaccination[];
  conditions: MedicalCondition[];
  exams: MedicalExam[];
}

export const VetCardModal: React.FC<VetCardModalProps> = ({
  isOpen,
  onClose,
  pet,
  medications,
  vaccinations,
  conditions,
  exams
}) => {
  const [copiedChip, setCopiedChip] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Active meds and conditions
  const activeMeds = medications.filter(m => m.petId === pet.id && m.isActive);
  const activeConditions = conditions.filter(c => c.petId === pet.id && (c.status === 'active' || c.status === 'chronic'));

  // Calculate age
  const calculateAge = (birthDate: string) => {
    try {
      const birth = new Date(birthDate);
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      return `${years > 0 ? `${years} lat ` : ''}${months} mies.`;
    } catch {
      return 'Brak daty';
    }
  };

  // Generate QR code for vet phone scanning
  useEffect(() => {
    if (!isOpen) return;

    // Compact summary for quick inspection via standard camera
    const summaryText = `PETCARE KARTA PACJENTA:
Imię: ${pet.name} (${pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Pupil'})
Rasa: ${pet.breed || 'Mieszaniec'}
Waga: ${pet.weightKg} kg
Chip: ${pet.chipNumber || 'Brak'}
Alergie: ${pet.allergies || 'Brak stwierdzonych'}
Leki stałe: ${activeMeds.map(m => `${m.name} (${m.dosage})`).join(', ') || 'Brak'}
Kontakt do właściciela: ${pet.vetPhone || 'Sprawdź w aplikacji'}`;

    QRCode.toDataURL(summaryText, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR', err));
  }, [isOpen, pet, activeMeds]);

  if (!isOpen) return null;

  const handleCopyChip = () => {
    if (!pet.chipNumber) return;
    navigator.clipboard.writeText(pet.chipNumber);
    setCopiedChip(true);
    setTimeout(() => setCopiedChip(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadPetMedicalReportPdf({
        pet,
        vaccinations: vaccinations.filter(v => v.petId === pet.id),
        medications: medications.filter(m => m.petId === pet.id),
        exams: exams.filter(e => e.petId === pet.id),
        conditions: conditions.filter(c => c.petId === pet.id),
        visits: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    void triggerPrint(`PetCare-${pet.name}-Karta-Pacjenta`, 'printable-vet-card');
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Emergency/Clinic Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">Karta Pacjenta (Tryb Lekarza)</h2>
                <span className="px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
                  Klinika & SOR
                </span>
              </div>
              <p className="text-xs text-slate-400">Podsumowanie medyczne do natychmiastowego okazania lekarzowi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition cursor-pointer" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div id="printable-vet-card" className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {/* Main Pet Profile Summary Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={pet.photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300'}
              alt={pet.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0"
            />
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">{pet.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Pupil'} • {pet.breed || 'Mieszaniec'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold text-xs block">WAGA AKTUALNA</span>
                  <span className="text-slate-900 font-extrabold text-sm">{pet.weightKg} kg</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold text-xs block">WIEK</span>
                  <span className="text-slate-900 font-extrabold text-sm">{calculateAge(pet.birthDate)}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold text-xs block">PŁEĆ</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {pet.gender === 'male' ? 'Samiec (♂)' : 'Samica (♀)'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold text-xs block">KASTRACJA</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {pet.isNeutered ? 'Tak ✓' : 'Nie'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Microchip & QR Code Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Microchip Display */}
            <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Numer Mikroczipu (Transpondera)
                </span>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-wider">
                    {pet.chipNumber || 'Brak wprowadzonego chipu'}
                  </span>
                  {pet.chipNumber && (
                    <button
                      onClick={handleCopyChip}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition"
                      title="Skopiuj numer chipu" aria-label="Skopiuj numer chipu"
                    >
                      {copiedChip ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Passport / Vet Contact */}
              <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-xs block">PASZPORT:</span>
                  <span className="font-semibold text-slate-800">{pet.passportNumber || 'Brak'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">PROWADZĄCA KLINIKA:</span>
                  <span className="font-semibold text-slate-800 truncate block">{pet.vetClinicName || 'Nie przypisano'}</span>
                </div>
              </div>
            </div>

            {/* Quick QR for Vet */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR pacjenta" className="w-24 h-24 rounded-lg" />
              ) : (
                <QrCode className="w-20 h-20 text-slate-300" />
              )}
              <span className="text-xs font-bold text-slate-600 mt-1">
                Zeskanuj aparatem lekarza
              </span>
            </div>
          </div>

          {/* CRITICAL WARNINGS: Allergies & Chronic Conditions */}
          {(pet.allergies || activeConditions.length > 0) && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>UWAGA LEKARZU: ALERGIE I CHOROBY PRZEWLEKŁE</span>
              </div>

              {pet.allergies && (
                <div className="text-xs text-rose-950 font-bold bg-white/80 p-2.5 rounded-xl border border-rose-200">
                  <span className="text-rose-700">Alergie: </span>
                  {pet.allergies}
                </div>
              )}

              {activeConditions.length > 0 && (
                <div className="text-xs text-rose-950 space-y-1">
                  {activeConditions.map(c => (
                    <div key={c.id} className="bg-white/80 p-2.5 rounded-xl border border-rose-200">
                      <div className="font-bold text-rose-900">{c.name}</div>
                      <div className="text-xs text-rose-800 mt-0.5">Leczenie/Uwagi: {c.treatment}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CURRENT ACTIVE MEDICATIONS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Pill className="w-4 h-4 text-amber-600" />
                Aktualnie przyjmowane leki ({activeMeds.length})
              </span>
            </div>

            {activeMeds.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl">
                Brak zarejestrowanych leków stałych.
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeMeds.map(m => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500">
                        Dawka: <span className="font-semibold text-slate-700">{m.dosage}</span> • {m.instructions || 'Zgodnie z zaleceniem'}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      Aktywny
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT VACCINATIONS & PREVENTATIVE CARE */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Syringe className="w-4 h-4 text-emerald-600" />
              Ostatnie szczepienia i profilaktyka
            </span>

            <div className="space-y-1.5">
              {vaccinations.filter(v => v.petId === pet.id).slice(0, 4).map(v => (
                <div key={v.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{v.name}</span>
                    <span className="text-xs text-slate-500 block">
                      Podano: {v.dateAdministered} • Ważne do: <span className="font-semibold text-emerald-700">{v.validUntil}</span>
                    </span>
                  </div>
                  {v.batchNumber && (
                    <span className="text-xs text-slate-400 font-mono">
                      Nr: {v.batchNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Drukuj
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'Generowanie...' : 'Pobierz pełny PDF'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
