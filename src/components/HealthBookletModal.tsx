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
  Share2,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Controls Bar (Responsive & Mobile-optimized) */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black truncate">
                Książeczka Zdrowia: {pet.name}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Format A4 &bull; Pełny raport medyczny do druku lub PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Primary Download PDF Action */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              title="Pobierz oficjalny plik PDF na telefon lub komputer"
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

            {/* Share or Print */}
            <button
              type="button"
              onClick={handleShareOrPrint}
              title="Udostępnij lub wydrukuj"
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">Drukuj</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container - perfectly fitted without horizontal overflow */}
        <div className="p-2 sm:p-6 overflow-y-auto overflow-x-hidden bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={bookletRef}
            className="bg-white p-3.5 sm:p-8 rounded-2xl shadow-sm border border-slate-200/90 print:border-none print:shadow-none print:p-0 w-full max-w-[210mm] mx-auto text-slate-800"
          >
            {/* Header / Passport Title */}
            <div className="flex flex-col-reverse sm:flex-row items-start justify-between border-b-2 border-teal-600 pb-4 mb-4 sm:mb-6 gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-2xs font-extrabold uppercase tracking-widest text-teal-700 mb-0.5">
                  Oficjalna Karta Zdrowia Zwierzęcia Domowego &bull; PetCare
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight break-words">
                  Książeczka Zdrowia: {pet.name}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
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
                  <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-800 text-[11px] sm:text-xs font-black rounded-lg border border-teal-200 uppercase">
                    {pet.species === 'dog' ? 'PIES / CANINE' : pet.species === 'cat' ? 'KOT / FELINE' : pet.species || 'ZWIERZĘ DOMOWE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 1: Basic Info & Owner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Gatunek / Rasa:</span>
                <span className="font-bold text-slate-900 break-words">{pet.breed || 'Mieszaniec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Płeć:</span>
                <span className="font-bold text-slate-900">{pet.gender === 'female' ? 'Samica' : 'Samiec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Wiek:</span>
                <span className="font-bold text-slate-900">{calculateAge(pet.birthDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Waga aktualna:</span>
                <span className="font-bold text-teal-700">{pet.weightKg ? `${pet.weightKg} kg` : 'Brak danych'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Numer Mikroczipa:</span>
                <span className="font-mono font-bold text-slate-900 break-all">{pet.chipNumber || 'Brak'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Paszport UE:</span>
                <span className="font-mono font-bold text-slate-900">{pet.passportNumber || 'Brak'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Umaszczenie:</span>
                <span className="font-bold text-slate-900">{pet.color || 'Standardowe'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Kastracja / Sterylizacja:</span>
                <span className="font-bold text-slate-900">{pet.isNeutered ? 'TAK' : 'NIE'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold text-[11px] block">Lecznica prowadząca:</span>
                <span className="font-bold text-slate-900 truncate">{pet.vetClinicName || 'Nie przypisano'}</span>
              </div>
            </div>

            {/* Critical Medical Warning Box if allergies or conditions exist */}
            {(pet.allergies || conditions.length > 0) && (
              <div className="mb-5 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 text-xs">
                <div className="font-black flex items-center gap-1.5 uppercase text-rose-800 mb-1 text-[11px]">
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

            {/* Section 1: Szczepienia */}
            <div className="mb-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Syringe className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>1. Rejestr Szczepień Ochronnych</span>
                </h2>
                {vaccinations.length > 0 && (
                  <span className="text-[10px] text-slate-400 sm:hidden flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Przesuń tabelę
                  </span>
                )}
              </div>

              {vaccinations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak zarejestrowanych szczepień w systemie.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
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
                        <tr key={v.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-2 font-mono border-r border-slate-200 text-slate-800">{v.dateAdministered}</td>
                          <td className="p-2 font-bold border-r border-slate-200 text-slate-900">{v.name}</td>
                          <td className="p-2 font-mono font-bold text-teal-800 border-r border-slate-200">{v.validUntil}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">{v.vetClinic || 'Lecznica'}</td>
                          <td className="p-2 text-center text-[10px] text-slate-400 italic">Podpisano</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Aktualne Leki */}
            <div className="mb-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>2. Przyjmowane Leki i Suplementacja</span>
                </h2>
                {medications.length > 0 && (
                  <span className="text-[10px] text-slate-400 sm:hidden flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Przesuń tabelę
                  </span>
                )}
              </div>

              {medications.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak stałych leków.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
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
                        <tr key={m.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-2 font-bold border-r border-slate-200 text-slate-900">{m.name}</td>
                          <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">{m.dosage}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-800">
                            {m.timesOfDay && m.timesOfDay.length > 0 
                              ? m.timesOfDay.map(t => `${t.label} (${t.time})`).join(', ') 
                              : 'Zgodnie z zaleceniem'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">{m.startDate} {m.endDate ? `➔ ${m.endDate}` : '(Stałe)'}</td>
                          <td className="p-2 text-slate-600">{m.instructions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 3: Badania i Diagnostyka */}
            <div className="mb-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>3. Historia Badań Diagnostycznych i Wizyt</span>
                </h2>
                {(exams.length > 0 || visits.length > 0) && (
                  <span className="text-[10px] text-slate-400 sm:hidden flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Przesuń tabelę
                  </span>
                )}
              </div>

              {exams.length === 0 && visits.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak wpisów o badaniach diagnostycznych.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full min-w-[500px] text-left border-collapse text-xs">
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
                        <tr key={e.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-2 font-mono border-r border-slate-200 text-slate-800">{e.date}</td>
                          <td className="p-2 font-bold border-r border-slate-200 text-slate-900">{e.title}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-800">{e.summary || 'Prawidłowy'}</td>
                          <td className="p-2 text-slate-700">{e.clinic || 'Lecznica'}</td>
                        </tr>
                      ))}
                      {visits.map(v => (
                        <tr key={v.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                          <td className="p-2 font-mono border-r border-slate-200 text-slate-800">{v.date}</td>
                          <td className="p-2 font-bold border-r border-slate-200 text-teal-900">{v.reason} (Wizyta)</td>
                          <td className="p-2 border-r border-slate-200 text-slate-800">{v.treatmentGiven || v.diagnosis || 'Zalecenia podano'}</td>
                          <td className="p-2 text-slate-700">{v.clinic || 'Lecznica'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                <div className="border border-dashed border-slate-300 rounded-xl h-14 sm:h-16 mt-2 flex items-center justify-center text-[10px] text-slate-400">
                  MIEJSCE NA PIECZĘĆ LEKARZA WETERYNARII
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-5 print:mt-10">
              Dokument wygenerowany cyfrowo w aplikacji PetCare. Zachowaj ten wydruk lub plik PDF w dokumentacji domowej pupila.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
