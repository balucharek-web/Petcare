import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Pill, 
  Scale, 
  FileHeart, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  EyeOff, 
  Sparkles, 
  Plus, 
  Users, 
  History,
  Check,
  Calendar,
  LayoutGrid
} from 'lucide-react';
import { Pet, Medication, Vaccination, DoseLogEntry, DashboardConfig } from '../types/pet';
import { storage } from '../services/storage';

interface TodayQuickActionsWidgetProps {
  pet: Pet;
  medications: Medication[];
  vaccinations: Vaccination[];
  onOpenVetCard: () => void;
  onOpenTimeline: () => void;
  onOpenMedications: () => void;
  onOpenVaccinations?: () => void;
  onOpenParasiteProtection?: () => void;
  onOpenFamilySharing: () => void;
  onOpenWeightModal: () => void;
  onToggleHideWidget: () => void;
  onOpenHomeScreenWidgetModal?: () => void;
  onDoseLogged?: () => void;
}

export const TodayQuickActionsWidget: React.FC<TodayQuickActionsWidgetProps> = ({
  pet,
  medications,
  vaccinations,
  onOpenVetCard,
  onOpenTimeline,
  onOpenMedications,
  onOpenVaccinations,
  onOpenParasiteProtection,
  onOpenFamilySharing,
  onOpenWeightModal,
  onToggleHideWidget,
  onOpenHomeScreenWidgetModal,
  onDoseLogged
}) => {
  const [doseLogs, setDoseLogs] = useState<DoseLogEntry[]>([]);
  const [justMarkedId, setJustMarkedId] = useState<string | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Load dose logs
  useEffect(() => {
    setDoseLogs(storage.getDoseLogs().filter(l => l.petId === pet.id && l.scheduledDate === todayStr));
  }, [pet.id, todayStr]);

  // Active medications for this pet
  const activeMeds = medications.filter(m => m.petId === pet.id && m.isActive);

  // Flatten all doses for today
  const todayDoses = activeMeds.flatMap(med => {
    return (med.timesOfDay || [{ id: 'default', label: 'Dziennie', time: '08:00', amount: med.dosage }]).map(schedule => {
      const log = doseLogs.find(l => l.medicationId === med.id && l.time === schedule.time);
      return {
        med,
        schedule,
        isCompleted: !!log?.completed,
        completedAt: log?.takenAt,
        logNotes: log?.notes
      };
    });
  });

  // Calculate preventive stats
  const dewormingVaccine = vaccinations
    .filter(v => v.petId === pet.id && (v.category === 'deworming' || v.name.toLowerCase().includes('odrobacz') || v.name.toLowerCase().includes('milprazon') || v.name.toLowerCase().includes('dehinel')))
    .sort((a, b) => new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime())[0];

  const tickVaccine = vaccinations
    .filter(v => v.petId === pet.id && (v.category === 'antiparasitic' || v.name.toLowerCase().includes('kleszcz') || v.name.toLowerCase().includes('bravecto') || v.name.toLowerCase().includes('nexgard') || v.name.toLowerCase().includes('simparica') || v.name.toLowerCase().includes('foresto')))
    .sort((a, b) => new Date(b.validUntil).getTime() - new Date(a.validUntil).getTime())[0];

  const rabiesVaccine = vaccinations
    .filter(v => v.petId === pet.id && (v.category === 'rabies' || v.name.toLowerCase().includes('wściekl') || v.name.toLowerCase().includes('rabisin') || v.name.toLowerCase().includes('nobivac r')))
    .sort((a, b) => new Date(b.validUntil).getTime() - new Date(a.validUntil).getTime())[0];

  const getDaysAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const nextVisit = storage.getVisits(pet.id)
    .flatMap(v => [
      { date: v.date, time: v.time, label: v.reason || 'Wizyta', clinic: v.clinic },
      ...(v.nextAppointmentDate ? [{ date: v.nextAppointmentDate, time: undefined, label: `Kontrola: ${v.reason || 'wizyta'}`, clinic: v.clinic }] : []),
    ])
    .filter(v => v.date && v.date.slice(0, 10) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const nextVaccineDue = vaccinations
    .filter(v => v.petId === pet.id && v.validUntil && v.validUntil.slice(0, 10) >= todayStr)
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil))[0];

  const dewormingDaysAgo = getDaysAgo(dewormingVaccine?.dateAdministered);
  const tickDaysUntil = getDaysUntil(tickVaccine?.validUntil);
  const rabiesDaysUntil = getDaysUntil(rabiesVaccine?.validUntil);

  // Handle instant mark dose
  const handleMarkDose = (med: Medication, scheduleTime: string, currentlyCompleted: boolean) => {
    const isNowCompleted = storage.toggleDoseLog(pet.id, med.id, scheduleTime, todayStr);
    const userName = localStorage.getItem('petcare_family_member') || 'Opiekun';

    // Update stock if marking as completed
    if (isNowCompleted && typeof med.currentStock === 'number' && med.currentStock > 0) {
      const allMeds = storage.getMedications();
      const updated = allMeds.map(m => m.id === med.id ? { ...m, currentStock: Math.max(0, (m.currentStock || 1) - 1) } : m);
      storage.saveMedications(updated);
    }

    setDoseLogs(storage.getDoseLogs(pet.id, todayStr));
    setJustMarkedId(`${med.id}_${scheduleTime}`);
    setTimeout(() => setJustMarkedId(null), 1800);

    if (onDoseLogged) {
      onDoseLogged();
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm transition-all relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-200/30 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                Dziś
              </h3>
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100/80 text-emerald-800 rounded-full">
                {pet.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Leki, terminy i profilaktyka
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {onOpenHomeScreenWidgetModal && (
            <button
              onClick={onOpenHomeScreenWidgetModal}
              title="Dodaj ten widżet na pulpit telefonu (Android Home Screen)" aria-label="Dodaj ten widżet na pulpit telefonu (Android Home Screen)"
              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/90 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1 font-bold shadow-2xs active:scale-95"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs">Pulpit telefonu</span>
            </button>
          )}

          {/* Hide optional widget button */}
          <button
            onClick={onToggleHideWidget}
            title="Ukryj ten widżet (możesz go włączyć w Dostosuj Pulpit)" aria-label="Ukryj ten widżet (możesz go włączyć w Dostosuj Pulpit)"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            <EyeOff className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Ukryj</span>
          </button>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4 relative z-10">
        <button
          onClick={onOpenVetCard}
          className="p-1.5 sm:p-2.5 bg-white hover:bg-rose-50 border border-gray-200/90 hover:border-rose-300 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-105 transition">
            <FileHeart className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4" />
          </div>
          <span className="text-[11px] min-[360px]:text-xs sm:text-xs font-bold text-gray-800 group-hover:text-rose-700 text-center leading-tight truncate w-full">
            Karta Lekarza
          </span>
        </button>

        <button
          onClick={onOpenTimeline}
          className="p-1.5 sm:p-2.5 bg-white hover:bg-teal-50 border border-gray-200/90 hover:border-teal-300 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition">
            <History className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4" />
          </div>
          <span className="text-[11px] min-[360px]:text-xs sm:text-xs font-bold text-gray-800 group-hover:text-teal-700 text-center leading-tight truncate w-full">
            Oś Czasu
          </span>
        </button>

        <button
          onClick={onOpenMedications}
          className="p-1.5 sm:p-2.5 bg-white hover:bg-amber-50 border border-gray-200/90 hover:border-amber-300 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition">
            <Pill className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4" />
          </div>
          <span className="text-[11px] min-[360px]:text-xs sm:text-xs font-bold text-gray-800 group-hover:text-amber-700 text-center leading-tight truncate w-full">
            Apteczka
          </span>
        </button>

        <button
          onClick={onOpenFamilySharing}
          className="p-1.5 sm:p-2.5 bg-white hover:bg-indigo-50 border border-gray-200/90 hover:border-indigo-300 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs group cursor-pointer"
        >
          <div className="w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition">
            <Users className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4" />
          </div>
          <span className="text-[11px] min-[360px]:text-xs sm:text-xs font-bold text-gray-800 group-hover:text-indigo-700 text-center leading-tight truncate w-full">
            Współopiekun
          </span>
        </button>
      </div>

      {/* TODAY'S DOSES LIST */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            Leki zaplanowane na dzisiaj ({todayDoses.length})
          </span>
          <button
            onClick={onOpenMedications}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
          >
            Zarządzaj apteczką <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {todayDoses.length === 0 ? (
          <div className="p-3 bg-white/80 border border-dashed border-gray-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Brak leków do podania na dziś. Wspaniale!</span>
            </div>
            <button
              onClick={onOpenMedications}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              + Dodaj lek
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayDoses.map(({ med, schedule, isCompleted, logNotes }) => {
              const key = `${med.id}_${schedule.time}`;
              const isJustMarked = justMarkedId === key;

              return (
                <div
                  key={key}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCompleted 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                      : 'bg-white border-gray-200/90 hover:border-emerald-300 shadow-2xs'
                  } ${isJustMarked ? 'ring-2 ring-emerald-500 scale-[1.01]' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleMarkDose(med, schedule.time, isCompleted)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-emerald-100 text-gray-400 hover:text-emerald-700'
                      }`}
                      title={isCompleted ? 'Kliknij, aby cofnąć zaznaczenie' : 'Kliknij, aby zaznaczyć jako podane'}
                    >
                      {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Circle className="w-5 h-5 stroke-[2]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {med.name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                          {schedule.time}
                        </span>
                        <span className="text-xs font-medium text-emerald-700">
                          {schedule.amount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {isCompleted && logNotes ? (
                          <span className="text-emerald-700 font-semibold">{logNotes}</span>
                        ) : (
                          med.instructions || 'Podaj zgodnie z zaleceniem'
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMarkDose(med, schedule.time, isCompleted)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {isCompleted ? '✓ Podano' : 'Zaznacz podane'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPCOMING: next visit & next vaccination */}
      <div className="mt-3.5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs relative z-10">
        <button
          type="button"
          onClick={onOpenTimeline}
          className="flex items-center gap-2.5 p-2.5 bg-white/90 border border-gray-100 rounded-2xl text-left hover:bg-white cursor-pointer min-h-[44px]"
        >
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-bold text-gray-500">Najbliższa wizyta</span>
            <span className="block font-extrabold text-gray-800 truncate">
              {nextVisit
                ? `${nextVisit.date.slice(0, 10) === todayStr ? 'Dziś' : `za ${getDaysUntil(nextVisit.date)} dni`}${nextVisit.time ? `, ${nextVisit.time}` : ''} · ${nextVisit.label}`
                : 'Brak zaplanowanych'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenVaccinations || onOpenTimeline}
          className="flex items-center gap-2.5 p-2.5 bg-white/90 border border-gray-100 rounded-2xl text-left hover:bg-white cursor-pointer min-h-[44px]"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-bold text-gray-500">Najbliższe szczepienie</span>
            <span className="block font-extrabold text-gray-800 truncate">
              {nextVaccineDue
                ? `${nextVaccineDue.name} · za ${getDaysUntil(nextVaccineDue.validUntil)} dni`
                : 'Brak terminów'}
            </span>
          </span>
        </button>
      </div>

      {/* PREVENTATIVE HEALTH STATUS ROW */}
      <div className="mt-3.5 pt-3 border-t border-emerald-100/80 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs relative z-10">
        {/* Odrobaczenie */}
        <button type="button" onClick={onOpenParasiteProtection || onOpenTimeline} className="p-1.5 min-[360px]:p-2.5 bg-white/90 border border-gray-100 rounded-2xl shadow-2xs text-center hover:bg-white hover:border-emerald-200 cursor-pointer min-h-[44px] min-w-0">
          <span className="text-[11px] min-[360px]:text-xs uppercase font-bold text-gray-400 block mb-0.5 truncate">
            Odrobaczenie
          </span>
          <div className="font-extrabold text-gray-800 text-xs min-[360px]:text-xs truncate">
            {dewormingDaysAgo !== null ? `${dewormingDaysAgo} dni temu` : 'Brak danych'}
          </div>
          <span className={`text-[11px] min-[360px]:text-xs font-semibold block mt-0.5 truncate ${
            dewormingDaysAgo !== null && dewormingDaysAgo > 90 ? 'text-rose-600' : 'text-emerald-600'
          }`}>
            {dewormingDaysAgo !== null && dewormingDaysAgo > 90 ? '⚠️ Czas powtórzyć' : '✓ Zalecane co 3 mies.'}
          </span>
        </button>

        {/* Kleszcze / Pasożyty */}
        <button type="button" onClick={onOpenParasiteProtection || onOpenTimeline} className="p-1.5 min-[360px]:p-2.5 bg-white/90 border border-gray-100 rounded-2xl shadow-2xs text-center hover:bg-white hover:border-emerald-200 cursor-pointer min-h-[44px] min-w-0">
          <span className="text-[11px] min-[360px]:text-xs uppercase font-bold text-gray-400 block mb-0.5 truncate">
            Kleszcze & Pchły
          </span>
          <div className="font-extrabold text-gray-800 text-xs min-[360px]:text-xs truncate">
            {tickDaysUntil !== null 
              ? (tickDaysUntil > 0 ? `Jeszcze ${tickDaysUntil} dni` : 'Wygasła') 
              : 'Brak danych'}
          </div>
          <span className={`text-[11px] min-[360px]:text-xs font-semibold block mt-0.5 truncate ${
            tickDaysUntil !== null && tickDaysUntil > 7 
              ? 'text-emerald-600' 
              : tickDaysUntil !== null 
              ? 'text-amber-600' 
              : 'text-gray-400'
          }`}>
            {tickDaysUntil !== null && tickDaysUntil > 0 ? '✓ Ochrona aktywna' : 'Podaj preparat'}
          </span>
        </button>

        {/* Wścieklizna */}
        <button type="button" onClick={onOpenVaccinations || onOpenTimeline} className="p-1.5 min-[360px]:p-2.5 bg-white/90 border border-gray-100 rounded-2xl shadow-2xs text-center hover:bg-white hover:border-emerald-200 cursor-pointer min-h-[44px] min-w-0">
          <span className="text-[11px] min-[360px]:text-xs uppercase font-bold text-gray-400 block mb-0.5 truncate">
            Wścieklizna
          </span>
          <div className="font-extrabold text-gray-800 text-xs min-[360px]:text-xs truncate">
            {rabiesDaysUntil !== null 
              ? (rabiesDaysUntil > 0 ? `Ważne (${rabiesDaysUntil} d.)` : 'Wygasło!') 
              : 'Brak danych'}
          </div>
          <span className={`text-[11px] min-[360px]:text-xs font-semibold block mt-0.5 truncate ${
            rabiesDaysUntil !== null && rabiesDaysUntil > 30 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {rabiesDaysUntil !== null && rabiesDaysUntil > 0 ? '✓ Szczepienie OK' : 'Zaszczep pupila'}
          </span>
        </button>
      </div>
    </div>
  );
};
