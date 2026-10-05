import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  Syringe, 
  Pill, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  User,
  LayoutGrid,
  FileSpreadsheet
} from 'lucide-react';
import { Pet } from '../types/pet';
import { storage } from '../services/storage';
import { downloadPetMedicalReportPdf, sharePetMedicalReportPdf, triggerPrint } from '../services/pdfReportGenerator';

interface HealthBookletModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
}

export const HealthBookletModal: React.FC<HealthBookletModalProps> = ({
  isOpen,
  onClose,
  pet,
}) => {
  const bookletRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'print'>('mobile');

  if (!isOpen) return null;

  const vaccinations = storage.getVaccinations().filter(v => v.petId === pet.id);
  const medications = storage.getMedications().filter(m => m.petId === pet.id);
  const exams = storage.getExams().filter(e => e.petId === pet.id);
  const conditions = storage.getConditions().filter(c => c.petId === pet.id);
  const visits = storage.getVisits().filter(v => v.petId === pet.id);

  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return 'Nieznany';
    const birth = new Date(birthDateString);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0) return `${months} mies.`;
    return months > 0 ? `${years} lat, ${months} mies.` : `${years} lat`;
  };

  const reportPayload = {
    pet,
    vaccinations,
    medications,
    exams,
    conditions,
    visits,
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      await downloadPetMedicalReportPdf(reportPayload);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Błąd pobierania PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareOrPrint = async () => {
    try {
      setIsExporting(true);
      const shared = await sharePetMedicalReportPdf(reportPayload);
      if (!shared) {
        await triggerPrint(`Ksiazeczka_${pet.name}`);
      }
    } catch (err) {
      console.warn('Fallback print:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/85 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 print:hidden border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black truncate">
                Karta Zdrowia: {pet.name}
              </h2>
              <p className="text-xs sm:text-xs text-slate-400 truncate">
                Dokumentacja weterynaryjna &bull; Gotowa do druku lub PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* View Mode Switcher */}
            <div className="hidden xs:flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs mr-1">
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'mobile' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Wygodny widok dopasowany do ekranu telefonu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Karty</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('print')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'print' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Arkusz formatu A4 z tabelami"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Arkusz A4</span>
              </button>
            </div>

            {/* Primary Download PDF Action */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              title="Pobierz oficjalny plik PDF na telefon lub komputer" aria-label="Pobierz oficjalny plik PDF na telefon lub komputer"
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Pobrano!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Pobierz PDF</span>
                </>
              )}
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handleShareOrPrint}
              title="Drukuj lub udostępnij" aria-label="Drukuj lub udostępnij"
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Drukuj</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer ml-1" aria-label="Zamknij">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher for extra small mobile screens */}
        <div className="xs:hidden flex bg-slate-100 p-1.5 border-b border-slate-200 justify-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition text-center ${
              viewMode === 'mobile' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-slate-600'
            }`}
          >
            📱 Widok dopasowany (Karty)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('print')}
            className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg transition text-center ${
              viewMode === 'print' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-slate-600'
            }`}
          >
            📄 Arkusz A4
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-2 sm:p-5 overflow-y-auto overflow-x-hidden bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          
          {/* ======================================================== */}
          {/* MODE 1: MOBILE OPTIMIZED CARDS (100% Screen width, 0px cut-off) */}
          {/* ======================================================== */}
          {viewMode === 'mobile' ? (
            <div className="w-full max-w-2xl mx-auto space-y-4 print:hidden">
              {/* Pet Bio Card */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
                <div className="flex items-center gap-3.5 mb-3.5 pb-3.5 border-b border-slate-100">
                  {pet.photoUrl ? (
                    <img 
                      src={pet.photoUrl} 
                      alt={pet.name} 
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-teal-600 shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-600 flex items-center justify-center text-2xl shrink-0">
                      🐾
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800 mb-1">
                      {pet.species === 'dog' ? 'PIES' : pet.species === 'cat' ? 'KOT' : 'ZWIERZĘ DOMOWE'}
                    </span>
                    <h1 className="text-xl font-black text-slate-900 leading-tight">
                      {pet.name}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      {pet.breed || 'Mieszaniec'} &bull; {pet.gender === 'female' ? 'Samica' : 'Samiec'}
                    </p>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block font-semibold">Wiek:</span>
                    <strong className="text-slate-900 font-bold">{calculateAge(pet.birthDate)}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block font-semibold">Waga:</span>
                    <strong className="text-teal-700 font-bold">{pet.weightKg ? `${pet.weightKg} kg` : 'Brak danych'}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block font-semibold">Numer Mikroczipa:</span>
                    <strong className="text-slate-900 font-mono text-xs break-all">{pet.chipNumber || 'Brak'}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block font-semibold">Kastracja:</span>
                    <strong className="text-slate-900 font-bold">{pet.isNeutered ? 'TAK' : 'NIE'}</strong>
                  </div>
                </div>

                {pet.vetClinicName && (
                  <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 text-xs">
                    <Building className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block">Lecznica prowadząca:</span>
                      <strong className="text-slate-900 truncate block">{pet.vetClinicName}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings & Allergies Box */}
              {(pet.allergies || conditions.length > 0) && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 text-rose-950 text-xs">
                  <div className="font-black flex items-center gap-1.5 uppercase text-rose-800 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Alergie &bull; Schorzenia &bull; Ważne ostrzeżenia</span>
                  </div>
                  {pet.allergies && (
                    <p className="mt-1">
                      <strong>Alergie:</strong> {pet.allergies}
                    </p>
                  )}
                  {conditions.length > 0 && (
                    <p className="mt-1">
                      <strong>Zdiagnozowane choroby:</strong> {conditions.map(c => c.name).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* SECTION: MEDICATIONS (Mobile Cards) */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-amber-500" />
                    <span>Leki i Suplementy ({medications.length})</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {medications.filter(m => m.isActive).length} aktywnych
                  </span>
                </div>

                {medications.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">Brak zapisanych leków w apteczce pupila.</p>
                ) : (
                  <div className="space-y-2.5">
                    {medications.map(m => (
                      <div 
                        key={m.id} 
                        className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/70 text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {m.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 shrink-0">
                            {m.isChronic ? 'Lek stały' : 'Kuracja'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/50">
                          <div>
                            <span className="text-xs text-slate-500 block font-semibold">Dawka:</span>
                            <strong className="text-slate-900 font-bold text-xs">{m.dosage || '1 dawka'}</strong>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block font-semibold">Pory podawania:</span>
                            <strong className="text-teal-800 font-bold text-xs">
                              {m.timesOfDay && m.timesOfDay.length > 0 
                                ? m.timesOfDay.map(t => `${t.label || ''} (${t.time})`).join(', ') 
                                : 'Zgodnie z zaleceniem'}
                            </strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">Okres: </span>
                            <span className="font-medium text-slate-800">{m.startDate} {m.endDate ? `➔ ${m.endDate}` : '(Stałe)'}</span>
                          </div>
                          {m.instructions && (
                            <div className="col-span-2 text-slate-700 bg-white/80 p-2 rounded-lg border border-amber-100">
                              💡 <strong>Zalecenia:</strong> {m.instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: VACCINATIONS (Mobile Cards) */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-teal-600" />
                    <span>Szczepienia Ochronne ({vaccinations.length})</span>
                  </h3>
                </div>

                {vaccinations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">Brak zarejestrowanych szczepień w systemie.</p>
                ) : (
                  <div className="space-y-2.5">
                    {vaccinations.map(v => (
                      <div 
                        key={v.id} 
                        className="bg-teal-50/40 rounded-xl p-3 border border-teal-200/70 text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {v.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-900 shrink-0">
                            Ważne do: {v.validUntil}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-200/50 text-xs">
                          <div>
                            <span className="text-slate-500 block">Data podania:</span>
                            <strong className="text-slate-800 font-mono">{v.dateAdministered}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Lecznica / Weterynarz:</span>
                            <span className="text-slate-800 font-medium">{v.vetClinic || 'Lecznica weterynaryjna'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: VISITS & EXAMS (Mobile Cards) */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span>Wizyty i Badania Diagnostyczne ({visits.length + exams.length})</span>
                  </h3>
                </div>

                {visits.length === 0 && exams.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">Brak zarejestrowanych wizyt ani badań diagnostycznych.</p>
                ) : (
                  <div className="space-y-2.5">
                    {exams.map(e => (
                      <div key={e.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="font-extrabold text-slate-900 text-sm">{e.title}</strong>
                          <span className="font-mono text-xs text-slate-500">{e.date}</span>
                        </div>
                        <p className="text-slate-700"><strong>Wynik:</strong> {e.summary || 'Prawidłowy'}</p>
                        {e.clinic && <p className="text-slate-500 text-xs">🏥 {e.clinic}</p>}
                      </div>
                    ))}

                    {visits.map(v => (
                      <div key={v.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="font-extrabold text-teal-900 text-sm">Wizyta: {v.reason}</strong>
                          <span className="font-mono text-xs text-slate-500">{v.date}</span>
                        </div>
                        <p className="text-slate-700"><strong>Zalecenia:</strong> {v.treatmentGiven || v.diagnosis || 'Kontrola okresowa'}</p>
                        {v.clinic && <p className="text-slate-500 text-xs">🏥 {v.clinic} {v.doctor ? `(${v.doctor})` : ''}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ======================================================== */}
          {/* MODE 2: CLASSIC A4 PRINT SHEET (Used for print & desktop preview) */}
          {/* ======================================================== */}
          <div 
            ref={bookletRef}
            className={`${viewMode === 'print' ? 'block' : 'hidden print:block'} bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 w-full max-w-[210mm] mx-auto text-slate-800`}
          >
            {/* Header / Passport Title */}
            <div className="flex flex-col-reverse sm:flex-row items-start justify-between border-b-2 border-teal-600 pb-4 mb-4 sm:mb-6 gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-2xs font-extrabold uppercase tracking-widest text-teal-700 mb-0.5">
                  Oficjalna Karta Zdrowia Zwierzęcia Domowego &bull; PetCare
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight break-words">
                  Książeczka Zdrowia: {pet.name}
                </h1>
                <p className="text-xs sm:text-xs text-slate-500 mt-0.5">
                  Wygenerowano z systemu PetCare &bull; Data: {new Date().toLocaleDateString('pl-PL')}
                </p>
              </div>

              {/* Photo & Species */}
              <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                {pet.photoUrl && (
                  <img 
                    src={pet.photoUrl} 
                    alt={pet.name} 
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-teal-600 shadow-sm"
                  />
                )}
                <div>
                  <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-800 text-xs sm:text-xs font-black rounded-lg border border-teal-200 uppercase">
                    {pet.species === 'dog' ? 'PIES / CANINE' : pet.species === 'cat' ? 'KOT / FELINE' : pet.species || 'ZWIERZĘ DOMOWE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 1: Basic Info & Owner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Gatunek / Rasa:</span>
                <span className="font-bold text-slate-900 break-words">{pet.breed || 'Mieszaniec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Płeć:</span>
                <span className="font-bold text-slate-900">{pet.gender === 'female' ? 'Samica' : 'Samiec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Wiek:</span>
                <span className="font-bold text-slate-900">{calculateAge(pet.birthDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Waga aktualna:</span>
                <span className="font-bold text-teal-700">{pet.weightKg ? `${pet.weightKg} kg` : 'Brak danych'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Numer Mikroczipa:</span>
                <span className="font-mono font-bold text-slate-900 break-all">{pet.chipNumber || 'Brak'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Paszport UE:</span>
                <span className="font-mono font-bold text-slate-900">{pet.passportNumber || 'Brak'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Umaszczenie:</span>
                <span className="font-bold text-slate-900">{pet.color || 'Standardowe'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Kastracja / Sterylizacja:</span>
                <span className="font-bold text-slate-900">{pet.isNeutered ? 'TAK' : 'NIE'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-xs block">Lecznica prowadząca:</span>
                <span className="font-bold text-slate-900 truncate">{pet.vetClinicName || 'Nie przypisano'}</span>
              </div>
            </div>

            {/* Warnings */}
            {(pet.allergies || conditions.length > 0) && (
              <div className="mb-5 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 text-xs">
                <div className="font-black flex items-center gap-1.5 uppercase text-rose-800 mb-1 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Ważne Informacje Medyczne &bull; Alergie &bull; Choroby Przewlekłe</span>
                </div>
                {pet.allergies && (
                  <p className="mt-0.5">
                    <strong>Alergie:</strong> {pet.allergies}
                  </p>
                )}
                {conditions.length > 0 && (
                  <p className="mt-0.5">
                    <strong>Zdiagnozowane schorzenia:</strong> {conditions.map(c => c.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Table 1: Vaccinations */}
            <div className="mb-5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                <Syringe className="w-4 h-4 text-teal-600 shrink-0" />
                <span>1. Rejestr Szczepień Ochronnych</span>
              </h2>
              {vaccinations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak zarejestrowanych szczepień w systemie.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Data</th>
                      <th className="p-2 border-r border-slate-200">Nazwa szczepionki</th>
                      <th className="p-2 border-r border-slate-200">Ważne do</th>
                      <th className="p-2 border-r border-slate-200">Lecznica / Lekarz</th>
                      <th className="p-2 w-28 text-center">Podpis / Pieczęć</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.map(v => (
                      <tr key={v.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono border-r border-slate-200">{v.dateAdministered}</td>
                        <td className="p-2 font-bold border-r border-slate-200">{v.name}</td>
                        <td className="p-2 font-mono font-bold text-teal-800 border-r border-slate-200">{v.validUntil}</td>
                        <td className="p-2 border-r border-slate-200">{v.vetClinic || 'Lecznica'}</td>
                        <td className="p-2 text-center text-xs text-slate-400 italic">Podpisano</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table 2: Medications */}
            <div className="mb-5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-amber-600 shrink-0" />
                <span>2. Przyjmowane Leki i Suplementacja</span>
              </h2>
              {medications.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak stałych leków.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Nazwa leku</th>
                      <th className="p-2 border-r border-slate-200">Dawka</th>
                      <th className="p-2 border-r border-slate-200">Pory / Godziny</th>
                      <th className="p-2 border-r border-slate-200">Okres leczenia</th>
                      <th className="p-2">Wskazówki</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map(m => (
                      <tr key={m.id} className="border-b border-slate-200">
                        <td className="p-2 font-bold border-r border-slate-200">{m.name}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{m.dosage}</td>
                        <td className="p-2 border-r border-slate-200">
                          {m.timesOfDay && m.timesOfDay.length > 0 
                            ? m.timesOfDay.map(t => `${t.label} (${t.time})`).join(', ') 
                            : 'Zgodnie z zaleceniem'}
                        </td>
                        <td className="p-2 border-r border-slate-200">{m.startDate} {m.endDate ? `➔ ${m.endDate}` : '(Stałe)'}</td>
                        <td className="p-2 text-slate-600">{m.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table 3: Exams & Visits */}
            <div className="mb-5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>3. Historia Badań Diagnostycznych i Wizyt</span>
              </h2>
              {exams.length === 0 && visits.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak wpisów o badaniach diagnostycznych.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Data</th>
                      <th className="p-2 border-r border-slate-200">Rodzaj / Cel</th>
                      <th className="p-2 border-r border-slate-200">Wynik / Zalecenia</th>
                      <th className="p-2">Lekarz / Klinika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(e => (
                      <tr key={e.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono border-r border-slate-200">{e.date}</td>
                        <td className="p-2 font-bold border-r border-slate-200">{e.title}</td>
                        <td className="p-2 border-r border-slate-200">{e.summary || 'Prawidłowy'}</td>
                        <td className="p-2">{e.clinic || 'Lecznica'}</td>
                      </tr>
                    ))}
                    {visits.map(v => (
                      <tr key={v.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono border-r border-slate-200">{v.date}</td>
                        <td className="p-2 font-bold border-r border-slate-200 text-teal-900">{v.reason} (Wizyta)</td>
                        <td className="p-2 border-r border-slate-200">{v.treatmentGiven || v.diagnosis || 'Zalecenia podano'}</td>
                        <td className="p-2">{v.clinic || 'Lecznica'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer stamp & signature area */}
            <div className="mt-6 pt-5 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500">
              <div>
                <p className="font-bold text-slate-800">Podpis Opiekuna Zwierzęcia:</p>
                <div className="border-b border-slate-300 mt-6 sm:mt-8"></div>
              </div>
              <div>
                <p className="font-bold text-slate-800">Pieczęć Przychodni Weterynaryjnej / Lekarza:</p>
                <div className="border border-dashed border-slate-300 rounded-xl h-14 sm:h-16 mt-2 flex items-center justify-center text-xs text-slate-400">
                  MIEJSCE NA PIECZĘĆ LEKARZA WETERYNARII
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-slate-400 mt-5 print:mt-10">
              Dokument wygenerowany cyfrowo w aplikacji PetCare. Zachowaj ten wydruk lub plik PDF w dokumentacji domowej pupila.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
