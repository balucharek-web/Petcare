import React from 'react';
import { X, Printer, Shield, Heart, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Pet, Vaccination, Medication, MedicalExam, MedicalCondition } from '../types/pet';

interface HealthPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  vaccinations: Vaccination[];
  medications: Medication[];
  exams: MedicalExam[];
  conditions: MedicalCondition[];
}

export const HealthPassportModal: React.FC<HealthPassportModalProps> = ({
  isOpen,
  onClose,
  pet,
  vaccinations,
  medications,
  exams,
  conditions,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-xl text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Książeczka Zdrowia i Raport Weterynaryjny</h2>
              <p className="text-xs text-slate-400">Podsumowanie medyczne do druku lub okazania w gabinecie</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow transition"
            >
              <Printer className="w-4 h-4" />
              Drukuj / Zapisz PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
          {/* Document Title Banner */}
          <div className="border-b-2 border-teal-600 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-700 font-bold text-sm uppercase tracking-wider">
                <Shield className="w-4 h-4" /> Paszport Medyczny Zwierzaka
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{pet.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Wygenerowano: {new Date().toLocaleDateString('pl-PL', { dateStyle: 'long' })} z aplikacji PetCare
              </p>
            </div>

            {/* Chip Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Nr Mikroczipa (Transponder)</span>
              <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                {pet.chipNumber || 'BRAK'}
              </span>
              {pet.passportNumber && (
                <div className="text-[11px] text-slate-600 mt-0.5">Paszport: <strong>{pet.passportNumber}</strong></div>
              )}
            </div>
          </div>

          {/* Vital Identity Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Gatunek i rasa</span>
              <strong className="text-slate-800">{pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Inny'}, {pet.breed || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Płeć i kastracja</span>
              <strong className="text-slate-800">
                {pet.gender === 'female' ? 'Samica' : 'Samiec'} {pet.isNeutered ? '(Wykastrowany/a)' : ''}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Data ur. / Waga</span>
              <strong className="text-slate-800">{pet.birthDate} ({pet.weightKg} kg)</strong>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Umaszczenie</span>
              <strong className="text-slate-800">{pet.color || '-'}</strong>
            </div>
          </div>

          {/* Allergies and Warnings */}
          {(pet.allergies || pet.specialNotes) && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-1">
              {pet.allergies && (
                <div className="text-rose-900">
                  <span className="font-bold text-rose-700 uppercase tracking-wide">⚠️ Alergie / Nietolerancje: </span>
                  {pet.allergies}
                </div>
              )}
              {pet.specialNotes && (
                <div className="text-slate-700">
                  <span className="font-semibold text-slate-800">Uwagi szczególne: </span>
                  {pet.specialNotes}
                </div>
              )}
            </div>
          )}

          {/* Active Medications */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
              💊 Przyjmowane Leki i Dawkowanie
            </h3>
            {medications.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Brak zapisanych leków.</p>
            ) : (
              <div className="space-y-2">
                {medications.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{m.name} ({m.dosage})</span>
                      <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-normal">
                        {m.isChronic ? 'Leczenie stałe' : 'Leczenie czasowe'}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600 flex flex-wrap gap-2">
                      <span>Pory: {m.timesOfDay.map(t => `${t.label} (${t.time}) - ${t.amount}`).join(' • ')}</span>
                    </div>
                    {m.instructions && (
                      <p className="mt-1 text-slate-500 text-[11px]">Zalecenia: {m.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vaccinations */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
              💉 Historia Szczepień
            </h3>
            {vaccinations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Brak wpisów o szczepieniach.</p>
            ) : (
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Szczepionka</th>
                    <th className="p-2.5">Data podania</th>
                    <th className="p-2.5">Ważne do</th>
                    <th className="p-2.5">Nr serii</th>
                    <th className="p-2.5">Lekarz / Gabinet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vaccinations.map((v) => (
                    <tr key={v.id}>
                      <td className="p-2.5 font-medium text-slate-900">{v.name}</td>
                      <td className="p-2.5 text-slate-600">{v.dateAdministered}</td>
                      <td className="p-2.5 font-semibold text-emerald-700">{v.validUntil}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500">{v.batchNumber || '-'}</td>
                      <td className="p-2.5 text-slate-600">{v.vetClinic || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Medical Conditions */}
          {conditions.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1 mb-2">
                📋 Historia Chorób i Diagnoz
              </h3>
              <div className="space-y-2">
                {conditions.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{c.name}</span>
                      <span className="text-slate-500 font-normal">Diagnoza: {c.diagnosisDate}</span>
                    </div>
                    {c.symptoms && <p className="text-slate-600 mt-1">Objawy: {c.symptoms}</p>}
                    {c.treatment && <p className="text-teal-800 mt-0.5">Zastosowane leczenie: {c.treatment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Physical Health Booklet Scans */}
          {pet.bookletScans && pet.bookletScans.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                📖 Dołączone skany fizycznej książeczki zdrowia
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {pet.bookletScans.map((scan) => (
                  <div key={scan.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1.5">
                    <img
                      src={scan.url}
                      alt={scan.title}
                      className="w-full h-28 object-cover rounded-lg"
                    />
                    <p className="text-[11px] font-semibold text-slate-800 truncate mt-1">{scan.title}</p>
                    <p className="text-[10px] text-slate-400">{scan.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vet Contact Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between text-xs text-slate-500">
            <div>
              <strong>Lekarz prowadzący:</strong> {pet.vetDoctorName || '-'} ({pet.vetClinicName || '-'})
              {pet.vetPhone && <span> • Tel: {pet.vetPhone}</span>}
            </div>
            <div>
              <strong>Dyżur całodobowy:</strong> {pet.emergencyClinicPhone || '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
