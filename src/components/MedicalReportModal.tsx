import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  Heart, 
  Pill, 
  Syringe, 
  FileSearch, 
  Scale, 
  Phone,
  Calendar,
  ShieldCheck,
  X
} from 'lucide-react';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition, VetVisit } from '../types/pet';

interface MedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  vaccinations: Vaccination[];
  medications: Medication[];
  exams: MedicalExam[];
  conditions: MedicalCondition[];
  visits: VetVisit[];
}

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({
  isOpen,
  onClose,
  pet,
  vaccinations,
  medications,
  exams,
  conditions,
  visits,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeMeds = medications.filter(m => m.isActive);
  const activeConditions = conditions.filter(c => c.status === 'active' || c.status === 'chronic');

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (years === 0) {
      return `${months} mies.`;
    }
    return `${years} lat ${months > 0 ? `${months} mies.` : ''}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const generateTextSummary = () => {
    const lines = [
      `📋 RAPORT MEDYCZNY PACJENTA - PETCARE`,
      `========================================`,
      `Pacjent: ${pet.name} (${pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species})`,
      `Rasa: ${pet.breed || 'Mieszaniec'} | Płeć: ${pet.gender === 'female' ? 'Samica' : 'Samiec'} | Kastracja: ${pet.isNeutered ? 'TAK' : 'NIE'}`,
      `Wiek: ${calculateAge(pet.birthDate)} (${pet.birthDate || 'Brak daty'})`,
      `Waga aktualna: ${pet.weightKg} kg`,
      `Mikroczip: ${pet.chipNumber || 'Brak'}`,
      `Paszport: ${pet.passportNumber || 'Brak'}`,
      ``,
      `🚨 ALERGIE I OSTRZEŻENIA:`,
      pet.allergies ? `• Alergie: ${pet.allergies}` : `• Brak znanych alergii`,
      pet.specialNotes ? `• Uwagi: ${pet.specialNotes}` : ``,
      ``,
      `💊 PRZYJMOWANE LEKI (${activeMeds.length}):`,
      activeMeds.length === 0 ? `• Brak stałych leków` : activeMeds.map(m => `• ${m.name} - ${m.dosage} (${m.instructions || 'zgodnie z zaleceniem'})`).join('\n'),
      ``,
      `🩺 CHOROBY I ZDIAGNOZOWANE STANY:`,
      activeConditions.length === 0 ? `• Brak aktywnych chorób przewlekłych` : activeConditions.map(c => `• ${c.name} (${c.diagnosisDate}): ${c.treatment}`).join('\n'),
      ``,
      `💉 OSTATNIE SZCZEPIENIA:`,
      vaccinations.slice(0, 4).map(v => `• ${v.name}: podano ${v.dateAdministered}, ważne do ${v.validUntil}`).join('\n') || `• Brak wpisów`,
      ``,
      `🏥 KONTAKT DO GABINETU:`,
      `Klinika: ${pet.vetClinicName || 'Nie ustawiono'}`,
      `Lekarz: ${pet.vetDoctorName || '-'}`,
      pet.vetPhone ? `Tel: ${pet.vetPhone}` : ``,
      pet.emergencyClinicPhone ? `Dyżur 24h: ${pet.emergencyClinicPhone}` : ``,
      `========================================`,
      `Wygenerowano z aplikacji PetCare w dniu ${new Date().toLocaleDateString('pl-PL')}`
    ];

    return lines.filter(Boolean).join('\n');
  };

  const handleCopy = () => {
    const text = generateTextSummary();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Actions (Not Printed) */}
        <div className="no-print p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Raport Medyczny & Książeczka PDF</h2>
              <p className="text-xs text-slate-400">Gotowy dokument dla lekarza weterynarii / kliniki całodobowej</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Skopiowano tekst' : 'Kopiuj tekst'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Drukuj / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 bg-white" id="printable-medical-report">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                alt={pet.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-900 shadow-sm"
              />
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-teal-700 font-bold">
                  KARTA ZDROWIA PACJENTA WETERYNARYJNEGO
                </span>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">
                  {pet.name}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {pet.breed || 'Zwierzak domowy'} • {pet.gender === 'female' ? 'Samica' : 'Samiec'} • {pet.isNeutered ? 'Kastrowany/a' : 'Niekastrowany/a'}
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-1 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>Data raportu: <strong>{new Date().toLocaleDateString('pl-PL')}</strong></div>
              <div>ID Chip: <strong className="text-teal-800">{pet.chipNumber || 'Brak'}</strong></div>
              <div>Paszport: <strong>{pet.passportNumber || 'Brak'}</strong></div>
            </div>
          </div>

          {/* Critical Warnings (Allergies / Chronic) */}
          {(pet.allergies || activeConditions.length > 0) && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>OSTRZEŻENIA MEDYCZNE I ALERGIE (UWAGA!)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {pet.allergies && (
                  <div>
                    <span className="text-slate-500 font-medium block">Alergie i nadwrażliwości:</span>
                    <strong className="text-rose-900">{pet.allergies}</strong>
                  </div>
                )}
                {activeConditions.length > 0 && (
                  <div>
                    <span className="text-slate-500 font-medium block">Choroby przewlekłe / diagnozy:</span>
                    <strong className="text-rose-900">
                      {activeConditions.map(c => c.name).join(', ')}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vital metrics */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Waga</span>
              <span className="text-base font-bold text-slate-900">{pet.weightKg} kg</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Wiek</span>
              <span className="text-base font-bold text-slate-900">{calculateAge(pet.birthDate)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Urodzenie</span>
              <span className="text-xs font-semibold text-slate-800">{pet.birthDate || '-'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Umaszczenie</span>
              <span className="text-xs font-semibold text-slate-800 truncate block">{pet.color || '-'}</span>
            </div>
          </div>

          {/* Active Medications & Dosage */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-600" />
              Aktualnie Przyjmowane Leki i Dawkowanie
            </h3>
            {activeMeds.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Brak aktualnie przyjmowanych leków stałych.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">Nazwa leku</th>
                      <th className="p-2.5">Dawka</th>
                      <th className="p-2.5">Godziny / Pory</th>
                      <th className="p-2.5">Instrukcja podania</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeMeds.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                        <td className="p-2.5">{m.dosage}</td>
                        <td className="p-2.5 font-mono text-teal-700">
                          {m.timesOfDay?.map(t => `${t.time} (${t.amount})`).join(', ') || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600">{m.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Vaccinations & Prophylaxis */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <Syringe className="w-4 h-4 text-emerald-600" />
              Szczepienia i Profilaktyka
            </h3>
            {vaccinations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Brak wpisów w historii szczepień.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">Szczepienie / Preparat</th>
                      <th className="p-2.5">Kategoria</th>
                      <th className="p-2.5">Data podania</th>
                      <th className="p-2.5">Ważne do</th>
                      <th className="p-2.5">Nr serii / Gabinet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vaccinations.slice(0, 6).map(v => (
                      <tr key={v.id}>
                        <td className="p-2.5 font-bold text-slate-900">{v.name}</td>
                        <td className="p-2.5 uppercase text-[10px] text-slate-500 font-mono">{v.category}</td>
                        <td className="p-2.5">{v.dateAdministered}</td>
                        <td className="p-2.5 font-bold text-emerald-700">{v.validUntil}</td>
                        <td className="p-2.5 text-slate-500">{v.batchNumber || v.vetClinic || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Exams & Blood Tests */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-blue-600" />
              Ostatnie Badania Laboratoryjne i Obrazowe
            </h3>
            {exams.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Brak zarejestrowanych badań laboratoryjnych.</p>
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 3).map(exam => (
                  <div key={exam.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900 text-sm">{exam.title}</strong>
                      <span className="font-mono text-slate-500">{exam.date} • {exam.clinic || 'Gabinet'}</span>
                    </div>
                    {exam.summary && <p className="text-slate-600">{exam.summary}</p>}
                    {exam.keyParameters && exam.keyParameters.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                        {exam.keyParameters.map((p, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">{p.name}</span>
                            <span className={`font-bold ${p.isFlagged ? 'text-rose-600' : 'text-slate-800'}`}>
                              {p.value} {p.unit || ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Primary Vet Clinic Contact */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-teal-800 block">Prowadzący Lekarz Weterynarii</span>
              <strong className="text-slate-900 text-sm">{pet.vetClinicName || 'Gabinet weterynaryjny'}</strong>
              <p className="text-slate-600">{pet.vetDoctorName || 'Lekarz prowadzący'}</p>
            </div>
            <div className="text-right space-y-1">
              {pet.vetPhone && (
                <div>Telefon do przychodni: <strong className="text-teal-900">{pet.vetPhone}</strong></div>
              )}
              {pet.emergencyClinicPhone && (
                <div>Dyżur całodobowy: <strong className="text-rose-700">{pet.emergencyClinicPhone}</strong></div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Wygenerowano automatycznie z aplikacji mobilnej PetCare. Dokument ma charakter informacyjny dla lekarza weterynarii.
          </div>
        </div>
      </div>
    </div>
  );
};
