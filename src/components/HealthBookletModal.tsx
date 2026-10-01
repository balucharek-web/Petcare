import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  ShieldCheck, 
  Syringe, 
  Pill, 
  Activity, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Scale, 
  HeartHandshake,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition, VetVisit } from '../types/pet';
import { storage } from '../services/storage';

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    if (!bookletRef.current) return;
    const content = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Ksiazeczka_Zdrowia_${pet.name}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: bold; }
    .header-box { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
    .stamp-box { border: 1px dashed #94a3b8; height: 50px; text-align: center; color: #94a3b8; font-size: 10px; padding-top: 15px; }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  ${bookletRef.current.innerHTML}
</body>
</html>`;

    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ksiazeczka_Zdrowia_${pet.name}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm sm:text-base font-black">
                Książeczka Zdrowia Pupila – Format A4
              </h2>
              <p className="text-2xs sm:text-xs text-slate-400">
                Gotowa do druku lub zapisu jako plik PDF (np. przed wizytą, podróżą lub hotelem)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Drukuj / Zapisz PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pobierz HTML</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={bookletRef}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-[210mm] mx-auto text-slate-800"
          >
            {/* Header / Passport Title */}
            <div className="flex items-start justify-between border-b-2 border-teal-600 pb-4 mb-6">
              <div>
                <div className="text-2xs font-extrabold uppercase tracking-widest text-teal-700 mb-1">
                  Oficjalna Karta Zdrowia Zwierzęcia Domowego &bull; PetCare Medical Record
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Książeczka Zdrowia: {pet.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wygenerowano z systemu PetCare &bull; Data wydruku: {new Date().toLocaleDateString('pl-PL')}
                </p>
              </div>

              {/* Photo & Species */}
              <div className="flex items-center gap-3 shrink-0">
                {pet.photoUrl && (
                  <img 
                    src={pet.photoUrl} 
                    alt={pet.name} 
                    className="w-20 h-20 rounded-xl object-cover border-2 border-teal-600 shadow-sm"
                  />
                )}
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-teal-50 text-teal-800 text-xs font-black rounded-lg border border-teal-200">
                    {pet.species === 'dog' ? 'PIES / CANINE' : pet.species === 'cat' ? 'KOT / FELINE' : 'ZWIERZĘ DOMOWE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 1: Basic Info & Owner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Gatunek / Rasa:</span>
                <span className="font-bold text-slate-900">{pet.breed || 'Mieszaniec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Płeć:</span>
                <span className="font-bold text-slate-900">{pet.gender === 'female' ? 'Samica' : 'Samiec'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Data urodzenia / Wiek:</span>
                <span className="font-bold text-slate-900">{pet.birthDate || 'Nieznana'} ({calculateAge(pet.birthDate)})</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Waga aktualna:</span>
                <span className="font-bold text-teal-700">{pet.weightKg ? `${pet.weightKg} kg` : 'Brak danych'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Numer Mikroczipa:</span>
                <span className="font-mono font-bold text-slate-900">{pet.chipNumber || 'Brak mikroczipa'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Paszport UE:</span>
                <span className="font-mono font-bold text-slate-900">{pet.passportNumber || 'Brak paszportu'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Umaszczenie:</span>
                <span className="font-bold text-slate-900">{pet.color || 'Standardowe'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Kastracja / Sterylizacja:</span>
                <span className="font-bold text-slate-900">{pet.isNeutered ? 'TAK (Wykastrowany/a)' : 'NIE'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Lecznica prowadząca:</span>
                <span className="font-bold text-slate-900">{pet.vetClinicName || 'Nie przypisano'}</span>
              </div>
            </div>

            {/* Critical Medical Warning Box if allergies or conditions exist */}
            {(pet.allergies || conditions.length > 0) && (
              <div className="mb-6 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-950 text-xs">
                <div className="font-black flex items-center gap-1.5 uppercase text-rose-800 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Ważne Informacje Medyczne &bull; Alergie &bull; Choroby Przewlekłe</span>
                </div>
                {pet.allergies && (
                  <p className="mt-1">
                    <strong>Alergie:</strong> {pet.allergies}
                  </p>
                )}
                {conditions.length > 0 && (
                  <p className="mt-1">
                    <strong>Zdiagnozowane schorzenia:</strong> {conditions.map(c => c.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Section 1: Szczepienia */}
            <div className="mb-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-teal-600" />
                <span>1. Rejestr Szczepień Ochronnych (Vaccinations)</span>
              </h2>
              {vaccinations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak zarejestrowanych szczepień w systemie.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Data podania</th>
                      <th className="p-2 border-r border-slate-200">Nazwa szczepionki</th>
                      <th className="p-2 border-r border-slate-200">Ważne do</th>
                      <th className="p-2 border-r border-slate-200">Lecznica / Lekarz</th>
                      <th className="p-2 w-32 text-center">Podpis i pieczątka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.map(v => (
                      <tr key={v.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono border-r border-slate-200">{v.dateAdministered}</td>
                        <td className="p-2 font-bold border-r border-slate-200">{v.name}</td>
                        <td className="p-2 font-mono font-bold text-teal-800 border-r border-slate-200">{v.validUntil}</td>
                        <td className="p-2 border-r border-slate-200">{v.vetClinic || 'Lecznica'}</td>
                        <td className="p-2 text-center text-3xs text-slate-400 italic">Pieczęć</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 2: Aktualne Leki */}
            <div className="mb-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                <Pill className="w-4 h-4 text-amber-600" />
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
                        <td className="p-2 border-r border-slate-200">{m.dosage}</td>
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

            {/* Section 3: Badania i Diagnostyka */}
            <div className="mb-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>3. Historia Badań Diagnostycznych i Zabiegów</span>
              </h2>
              {exams.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Brak wpisów o badaniach diagnostycznych.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200">Data</th>
                      <th className="p-2 border-r border-slate-200">Rodzaj badania</th>
                      <th className="p-2 border-r border-slate-200">Wynik / Diagnoza</th>
                      <th className="p-2">Lekarz / Klinika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(e => (
                      <tr key={e.id} className="border-b border-slate-200">
                        <td className="p-2 font-mono border-r border-slate-200">{e.date}</td>
                        <td className="p-2 font-bold border-r border-slate-200">{e.title} ({e.category})</td>
                        <td className="p-2 border-r border-slate-200">{e.summary || 'Prawidłowy'}</td>
                        <td className="p-2">{e.clinic || 'Lecznica'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer stamp & signature area */}
            <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-800">Podpis Opiekuna Zwierzęcia:</p>
                <div className="border-b border-slate-300 mt-8"></div>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Pieczęć Przychodni Weterynaryjnej / Lekarza:</p>
                <div className="border border-dashed border-slate-300 rounded-xl h-16 mt-2 flex items-center justify-center text-3xs text-slate-400">
                  MIEJSCE NA PIECZĘĆ LEKARZA WETERYNARII
                </div>
              </div>
            </div>

            <div className="text-center text-3xs text-slate-400 mt-6 print:mt-10">
              Dokument wygenerowany cyfrowo w aplikacji PetCare. Zachowaj ten wydruk w dokumentacji domowej pupila.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
