import React, { useState } from 'react';
import { 
  Stethoscope, 
  Plus, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  DollarSign, 
  ExternalLink, 
  Download, 
  Clock, 
  FileText,
  Activity
} from 'lucide-react';
import { Pet, MedicalCondition, VetVisit, DiseaseStatus } from '../types/pet';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  buildVetVisitCalendarEvent 
} from '../services/calendar';

interface DiseasesAndVisitsViewProps {
  pet: Pet;
  conditions: MedicalCondition[];
  visits: VetVisit[];
  onUpdateConditions: (items: MedicalCondition[]) => void;
  onUpdateVisits: (items: VetVisit[]) => void;
}

export const DiseasesAndVisitsView: React.FC<DiseasesAndVisitsViewProps> = ({
  pet,
  conditions,
  visits,
  onUpdateConditions,
  onUpdateVisits,
}) => {
  const [subTab, setSubTab] = useState<'conditions' | 'visits'>('conditions');

  // Condition modal state
  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [editingCondition, setEditingCondition] = useState<MedicalCondition | null>(null);
  const [cName, setCName] = useState('');
  const [cDate, setCDate] = useState(new Date().toISOString().slice(0, 10));
  const [cStatus, setCStatus] = useState<DiseaseStatus>('active');
  const [cSymptoms, setCSymptoms] = useState('');
  const [cTreatment, setCTreatment] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [cResolvedDate, setCResolvedDate] = useState('');

  // Visit modal state
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VetVisit | null>(null);
  const [vDate, setVDate] = useState(new Date().toISOString().slice(0, 10));
  const [vTime, setVTime] = useState('11:00');
  const [vReason, setVReason] = useState('');
  const [vClinic, setVClinic] = useState(pet.vetClinicName || '');
  const [vDoctor, setVDoctor] = useState(pet.vetDoctorName || '');
  const [vDiagnosis, setVDiagnosis] = useState('');
  const [vTreatment, setVTreatment] = useState('');
  const [vCost, setVCost] = useState('');
  const [vNextDate, setVNextDate] = useState('');
  const [vNotes, setVNotes] = useState('');

  const totalCost = visits.reduce((acc, v) => acc + (v.costPln || 0), 0);

  // Conditions Handlers
  const handleOpenAddCondition = () => {
    setEditingCondition(null);
    setCName('');
    setCDate(new Date().toISOString().slice(0, 10));
    setCStatus('active');
    setCSymptoms('');
    setCTreatment('');
    setCNotes('');
    setCResolvedDate('');
    setIsAddingCondition(true);
  };

  const handleOpenEditCondition = (c: MedicalCondition) => {
    setEditingCondition(c);
    setCName(c.name);
    setCDate(c.diagnosisDate);
    setCStatus(c.status);
    setCSymptoms(c.symptoms);
    setCTreatment(c.treatment);
    setCNotes(c.vetNotes || '');
    setCResolvedDate(c.resolvedDate || '');
    setIsAddingCondition(true);
  };

  const handleSaveCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;

    if (editingCondition) {
      const updated = conditions.map(c => {
        if (c.id === editingCondition.id) {
          return {
            ...c,
            name: cName.trim(),
            diagnosisDate: cDate,
            status: cStatus,
            symptoms: cSymptoms.trim(),
            treatment: cTreatment.trim(),
            vetNotes: cNotes.trim() || undefined,
            resolvedDate: cResolvedDate || undefined,
          };
        }
        return c;
      });
      onUpdateConditions(updated);
    } else {
      const newCond: MedicalCondition = {
        id: `cond-${Date.now()}`,
        petId: pet.id,
        name: cName.trim(),
        diagnosisDate: cDate,
        status: cStatus,
        symptoms: cSymptoms.trim(),
        treatment: cTreatment.trim(),
        vetNotes: cNotes.trim() || undefined,
        resolvedDate: cResolvedDate || undefined,
      };
      onUpdateConditions([...conditions, newCond]);
    }
    setIsAddingCondition(false);
  };

  const handleDeleteCondition = (id: string) => {
    onUpdateConditions(conditions.filter(c => c.id !== id));
  };

  // Visits Handlers
  const handleOpenAddVisit = () => {
    setEditingVisit(null);
    setVDate(new Date().toISOString().slice(0, 10));
    setVTime('11:00');
    setVReason('');
    setVClinic(pet.vetClinicName || '');
    setVDoctor(pet.vetDoctorName || '');
    setVDiagnosis('');
    setVTreatment('');
    setVCost('');
    setVNextDate('');
    setVNotes('');
    setIsAddingVisit(true);
  };

  const handleOpenEditVisit = (v: VetVisit) => {
    setEditingVisit(v);
    setVDate(v.date);
    setVTime(v.time || '11:00');
    setVReason(v.reason);
    setVClinic(v.clinic);
    setVDoctor(v.doctor || '');
    setVDiagnosis(v.diagnosis || '');
    setVTreatment(v.treatmentGiven || '');
    setVCost(v.costPln ? String(v.costPln) : '');
    setVNextDate(v.nextAppointmentDate || '');
    setVNotes(v.notes || '');
    setIsAddingVisit(true);
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vReason.trim()) return;

    if (editingVisit) {
      const updated = visits.map(v => {
        if (v.id === editingVisit.id) {
          return {
            ...v,
            date: vDate,
            time: vTime || undefined,
            reason: vReason.trim(),
            clinic: vClinic.trim(),
            doctor: vDoctor.trim() || undefined,
            diagnosis: vDiagnosis.trim() || undefined,
            treatmentGiven: vTreatment.trim() || undefined,
            costPln: vCost ? parseFloat(vCost) : undefined,
            nextAppointmentDate: vNextDate || undefined,
            notes: vNotes.trim() || undefined,
          };
        }
        return v;
      });
      onUpdateVisits(updated);
    } else {
      const newVisit: VetVisit = {
        id: `vis-${Date.now()}`,
        petId: pet.id,
        date: vDate,
        time: vTime || undefined,
        reason: vReason.trim(),
        clinic: vClinic.trim() || 'Gabinet Weterynaryjny',
        doctor: vDoctor.trim() || undefined,
        diagnosis: vDiagnosis.trim() || undefined,
        treatmentGiven: vTreatment.trim() || undefined,
        costPln: vCost ? parseFloat(vCost) : undefined,
        nextAppointmentDate: vNextDate || undefined,
        notes: vNotes.trim() || undefined,
      };
      onUpdateVisits([...visits, newVisit]);
    }
    setIsAddingVisit(false);
  };

  const handleDeleteVisit = (id: string) => {
    onUpdateVisits(visits.filter(v => v.id !== id));
  };

  // Calendar sync for visit
  const handleAddVisitToCalendar = (v: VetVisit, isGoogle: boolean) => {
    const targetDate = v.nextAppointmentDate || v.date;
    const isFuture = new Date(targetDate) >= new Date();
    const event = buildVetVisitCalendarEvent(
      pet.name,
      isFuture && v.nextAppointmentDate ? `Kolejna wizyta: ${v.reason}` : v.reason,
      targetDate,
      v.time,
      v.clinic,
      v.notes
    );

    if (isGoogle) {
      window.open(createGoogleCalendarUrl(event), '_blank');
    } else {
      downloadICalendarFile(`Wizyta_${pet.name}_${v.reason.replace(/\s+/g, '_')}`, [event]);
    }
  };

  if (isAddingVisit) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            {editingVisit ? 'Edytuj wizytę' : 'Dodaj nową wizytę weterynaryjną'}
          </h3>
          <button
            type="button"
            onClick={() => setIsAddingVisit(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveVisit} className="space-y-3 text-sm">
          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Cel wizyty / Powód *</label>
            <input
              type="text"
              required
              placeholder="np. Kontrola okresowa, Badanie krwi, Zabieg"
              value={vReason}
              onChange={(e) => setVReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-teal-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Data wizyty *</label>
              <input
                type="date"
                required
                value={vDate}
                onChange={(e) => setVDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Godzina</label>
              <input
                type="time"
                value={vTime}
                onChange={(e) => setVTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-teal-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Klinika / Gabinet</label>
              <input
                type="text"
                placeholder="np. Klinika Weterynaryjna"
                value={vClinic}
                onChange={(e) => setVClinic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Lekarz</label>
              <input
                type="text"
                placeholder="dr wet."
                value={vDoctor}
                onChange={(e) => setVDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Koszt (PLN)</label>
              <input
                type="number"
                step="1"
                placeholder="np. 150"
                value={vCost}
                onChange={(e) => setVCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Następna wizyta</label>
              <input
                type="date"
                value={vNextDate}
                onChange={(e) => setVNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-teal-400 text-xs sm:text-sm font-bold text-teal-800"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Przebieg i zalecenia</label>
            <input
              type="text"
              placeholder="np. Podano antybiotyk, kontrola za 7 dni"
              value={vTreatment}
              onChange={(e) => setVTreatment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingVisit(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow transition text-xs sm:text-sm active:scale-98"
            >
              Zapisz wizytę
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (isAddingCondition) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            {editingCondition ? 'Edytuj historię choroby' : 'Dodaj chorobę / diagnozę'}
          </h3>
          <button
            type="button"
            onClick={() => setIsAddingCondition(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveCondition} className="space-y-3 text-sm">
          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Nazwa choroby / diagnozy *</label>
            <input
              type="text"
              required
              placeholder="np. Alergia pokarmowa, Zapalenie ucha"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-teal-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Data diagnozy</label>
              <input
                type="date"
                required
                value={cDate}
                onChange={(e) => setCDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Status</label>
              <select
                value={cStatus}
                onChange={(e) => setCStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-800"
              >
                <option value="active">W trakcie leczenia (aktywna)</option>
                <option value="cured">Wyleczona</option>
                <option value="chronic">Przewlekła</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Zalecenia i opis leczenia</label>
            <input
              type="text"
              placeholder="np. Dieta eliminacyjna, unikać kurczaka"
              value={cNotes}
              onChange={(e) => setCNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingCondition(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow transition text-xs sm:text-sm active:scale-98"
            >
              Zapisz diagnozę
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Subtab Toggle Buttons */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex gap-1">
        <button
          onClick={() => setSubTab('conditions')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'conditions'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Historia Chorób ({conditions.length})
        </button>
        <button
          onClick={() => setSubTab('visits')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'visits'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Wizyty i Koszty ({visits.length})
        </button>
      </div>

      {/* Conditions Tab Content */}
      {subTab === 'conditions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Zdiagnozowane choroby i dolegliwości</h3>
              <p className="text-xs text-slate-400">Śledź przebieg leczenia i historię nawrotów</p>
            </div>
            <button
              onClick={handleOpenAddCondition}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj chorobę
            </button>
          </div>

          {conditions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-700">Brak zarejestrowanych chorób</p>
              <p className="text-xs text-slate-400 mt-1">Twój zwierzak cieszy się znakomitym zdrowiem!</p>
              <button
                onClick={handleOpenAddCondition}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Dodaj wpis o przebytej chorobie
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{c.name}</h4>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            c.status === 'cured'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'chronic'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status === 'cured' ? 'Wyleczona ✓' : c.status === 'chronic' ? 'Przewlekła' : 'W trakcie leczenia'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Data diagnozy: <strong className="text-slate-700">{c.diagnosisDate}</strong>
                        {c.resolvedDate && ` • Zakończono: ${c.resolvedDate}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCondition(c)}
                        title="Edytuj"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCondition(c.id)}
                        title="Usuń"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {c.symptoms && (
                    <div className="text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Zaobserwowane objawy</span>
                      <p className="text-slate-700">{c.symptoms}</p>
                    </div>
                  )}

                  {c.treatment && (
                    <div className="text-xs bg-teal-50/60 p-3 rounded-2xl border border-teal-100">
                      <span className="text-teal-700 font-bold uppercase text-[10px] block mb-0.5">Zastosowane leczenie / zalecenia</span>
                      <p className="text-teal-950 font-medium">{c.treatment}</p>
                    </div>
                  )}

                  {c.vetNotes && (
                    <p className="text-xs text-slate-500 italic px-1">
                      Uwagi lekarza: {c.vetNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visits Tab Content */}
      {subTab === 'visits' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Podsumowanie opieki
              </span>
              <p className="text-xl font-extrabold text-teal-400">
                {totalCost > 0 ? `${totalCost.toLocaleString('pl-PL')} zł` : '0 zł'}
              </p>
              <span className="text-xs text-slate-400">Suma wydatków na leczenie ({visits.length} wizyt)</span>
            </div>

            <button
              onClick={handleOpenAddVisit}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj wizytę
            </button>
          </div>

          {visits.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm text-slate-700">Brak zarejestrowanych wizyt</p>
              <p className="text-xs text-slate-400 mt-1">Zapisuj wizyty u weterynarza, zalecenia i koszty.</p>
              <button
                onClick={handleOpenAddVisit}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Dodaj pierwszą wizytę
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{v.reason}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Data: <strong className="text-slate-700">{v.date}</strong> {v.time ? `o ${v.time}` : ''} • {v.clinic}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {v.costPln && (
                        <span className="font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl">
                          {v.costPln} zł
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEditVisit(v)}
                        title="Edytuj"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVisit(v.id)}
                        title="Usuń"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {v.treatmentGiven && (
                    <div className="text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Przebieg wizyty / zabiegi</span>
                      <p className="text-slate-700">{v.treatmentGiven}</p>
                    </div>
                  )}

                  {v.doctor && (
                    <p className="text-xs text-slate-500">Lekarz przyjmujący: <strong>{v.doctor}</strong></p>
                  )}

                  {/* Calendar Sync for Visit */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
                      <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                      Dodaj do kalendarza:
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleAddVisitToCalendar(v, true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Google
                      </button>
                      <button
                        onClick={() => handleAddVisitToCalendar(v, false)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Telefon (.ics)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
