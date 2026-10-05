import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download, 
  ExternalLink, 
  Syringe, 
  Pill, 
  Stethoscope, 
  FileSearch, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Check, 
  Trash2, 
  Scissors, 
  Scale, 
  Heart, 
  AlertCircle,
  X
} from 'lucide-react';
import { 
  Pet, 
  Vaccination, 
  Medication, 
  MedicalExam, 
  VetVisit, 
  ParasiteProtection,
  CalendarCustomEvent,
  CustomEventCategory 
} from '../types/pet';
import { storage } from '../services/storage';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  buildVaccinationCalendarEvent,
  buildVetVisitCalendarEvent,
  buildMedicationCalendarEvent,
  buildParasiteCalendarEvent,
  buildCustomCalendarEvent,
  CalendarEventPayload
} from '../services/calendar';

interface CalendarHubViewProps {
  pet: Pet;
  vaccinations: Vaccination[];
  medications: Medication[];
  exams: MedicalExam[];
  visits: VetVisit[];
  parasites?: ParasiteProtection[];
  onOpenParasiteProtection?: () => void;
}

interface UnifiedCalendarEvent {
  id: string;
  sourceType: 'vaccine' | 'visit' | 'exam' | 'medication' | 'parasite' | 'custom';
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  details: string;
  badgeLabel: string;
  badgeColor: string;
  dotColor: string;
  rawPayload: CalendarEventPayload;
  customEventId?: string;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const WEEKDAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

export const CalendarHubView: React.FC<CalendarHubViewProps> = ({
  pet,
  vaccinations,
  medications,
  exams,
  visits,
  parasites: propParasites,
  onOpenParasiteProtection
}) => {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Month navigation state
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed

  // Selected date in calendar
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIso);

  // Custom in-app calendar events from storage
  const [customEvents, setCustomEvents] = useState<CalendarCustomEvent[]>(() => 
    storage.getCustomCalendarEvents(pet.id)
  );

  // Parasites protections (from props or storage)
  const parasitesList = propParasites || storage.getParasites(pet.id);

  // Modal to add custom event
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newCategory, setNewCategory] = useState<CustomEventCategory>('groomer');
  const [newNotes, setNewNotes] = useState('');

  // -------------------------------------------------------------
  // Aggregate ALL events for this pet across all subsystems
  // -------------------------------------------------------------
  const allEvents = useMemo(() => {
    const list: UnifiedCalendarEvent[] = [];

    // 1. Vaccinations
    vaccinations.forEach((v) => {
      list.push({
        id: `ev-vac-${v.id}`,
        sourceType: 'vaccine',
        title: `Szczepienie: ${v.name}`,
        date: v.validUntil,
        time: '09:00',
        details: `Termin ważności szczepienia. Gabinet: ${v.vetClinic || 'Weterynarz'}`,
        badgeLabel: 'Szczepienie',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        dotColor: 'bg-purple-500',
        rawPayload: buildVaccinationCalendarEvent(pet.name, v.name, v.validUntil, v.vetClinic),
      });
    });

    // 2. Vet Visits (Next appointments)
    visits.forEach((v) => {
      if (v.nextAppointmentDate) {
        list.push({
          id: `ev-vis-${v.id}`,
          sourceType: 'visit',
          title: `Wizyta: ${v.reason}`,
          date: v.nextAppointmentDate,
          time: v.time || '10:00',
          details: `Kolejna zaplanowana wizyta w: ${v.clinic}`,
          badgeLabel: 'Wizyta',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dotColor: 'bg-blue-500',
          rawPayload: buildVetVisitCalendarEvent(pet.name, `Wizyta: ${v.reason}`, v.nextAppointmentDate, v.time, v.clinic, v.notes),
        });
      }
    });

    // 3. Medical Exams (Next control dates)
    exams.forEach((ex) => {
      if (ex.nextRecommendedDate) {
        list.push({
          id: `ev-exam-${ex.id}`,
          sourceType: 'exam',
          title: `Badanie: ${ex.title}`,
          date: ex.nextRecommendedDate,
          time: '11:00',
          details: `Zalecana kontrola laboratoryjna: ${ex.summary.slice(0, 70)}`,
          badgeLabel: 'Badanie',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dotColor: 'bg-amber-500',
          rawPayload: {
            title: `🔬 ${pet.name}: Kontrola badania - ${ex.title}`,
            description: `Zalecana kontrola: ${ex.title}\nWynik poprzedni: ${ex.summary}`,
            startDate: `${ex.nextRecommendedDate}T11:00:00`,
            endDate: `${ex.nextRecommendedDate}T11:30:00`,
            isAllDay: true,
          },
        });
      }
    });

    // 4. Parasite & Tick Protections
    parasitesList.forEach((par) => {
      const typeLabel = par.type === 'tick_flea' ? 'Kleszcze & Pchły' : 'Odrobaczanie';
      list.push({
        id: `ev-par-${par.id}`,
        sourceType: 'parasite',
        title: `${typeLabel}: ${par.productName}`,
        date: par.validUntil,
        time: '09:00',
        details: `Koniec działania preparatu ${par.productName}. Czas na kolejną dawkę!`,
        badgeLabel: typeLabel,
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dotColor: 'bg-emerald-500',
        rawPayload: buildParasiteCalendarEvent(pet.name, par.productName, par.type, par.validUntil, par.form),
      });
    });

    // 5. Custom in-app calendar events
    customEvents.forEach((ce) => {
      const catLabels: Record<CustomEventCategory, string> = {
        groomer: 'Fryzjer / Groomer',
        weight: 'Ważenie',
        hygiene: 'Higiena & Pielęgnacja',
        walk_trip: 'Wyjazd / Spacer',
        other: 'Wydarzenie',
      };

      list.push({
        id: `ev-custom-${ce.id}`,
        sourceType: 'custom',
        title: ce.title,
        date: ce.date,
        time: ce.time || undefined,
        details: ce.notes || catLabels[ce.category],
        badgeLabel: catLabels[ce.category] || 'Wydarzenie',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        dotColor: 'bg-teal-500',
        rawPayload: buildCustomCalendarEvent(pet.name, ce.title, ce.date, ce.time, catLabels[ce.category], ce.notes),
        customEventId: ce.id,
      });
    });

    // Sort chronologically
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [vaccinations, visits, exams, parasitesList, customEvents, pet.name]);

  // Daily Active Medications
  const activeMeds = medications.filter(m => m.isActive);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarEvent[]>();
    allEvents.forEach((ev) => {
      const cur = map.get(ev.date) || [];
      cur.push(ev);
      map.set(ev.date, cur);
    });
    return map;
  }, [allEvents]);

  // Calendar Grid computation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Polish Monday-first index: 0 = Mon, ..., 6 = Sun
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month tail days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      days.push({
        dateStr: prevDate.toISOString().slice(0, 10),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const curDate = new Date(currentYear, currentMonth, d);
      days.push({
        dateStr: curDate.toISOString().slice(0, 10),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month head days to complete grid (up to 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      days.push({
        dateStr: nextDate.toISOString().slice(0, 10),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Events for selected date
  const selectedDayEvents = eventsByDate.get(selectedDate) || [];

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(todayIso);
  };

  // Add custom event handler
  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEv: CalendarCustomEvent = {
      id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      petId: pet.id,
      title: newTitle.trim(),
      date: selectedDate,
      time: newTime.trim() || undefined,
      category: newCategory,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    storage.saveCustomCalendarEvent(newEv);
    setCustomEvents(storage.getCustomCalendarEvents(pet.id));
    setIsAddingEvent(false);
    setNewTitle('');
    setNewTime('');
    setNewNotes('');
  };

  const handleDeleteCustomEvent = (id: string) => {
    storage.deleteCustomCalendarEvent(id);
    setCustomEvents(storage.getCustomCalendarEvents(pet.id));
  };

  // Google Calendar integration
  const handleOpenGoogleCalendar = (payload: CalendarEventPayload) => {
    const url = createGoogleCalendarUrl(payload);
    window.open(url, '_blank');
  };

  const handleDownloadSingleIcs = (payload: CalendarEventPayload, title: string) => {
    downloadICalendarFile(`Termin_${pet.name}_${title.replace(/\s+/g, '_')}`, [payload]);
  };

  // Global export to .ics file (All events + daily meds)
  const handleExportAllToPhoneCalendar = () => {
    const allPayloads: CalendarEventPayload[] = [
      ...allEvents.map(e => e.rawPayload),
      ...activeMeds.flatMap(m => 
        m.timesOfDay.map(s => 
          buildMedicationCalendarEvent(pet.name, m.name, s.amount, s.time, m.instructions, true)
        )
      )
    ];

    if (allPayloads.length === 0) {
      alert('Brak zaplanowanych wydarzeń do eksportu.');
      return;
    }

    downloadICalendarFile(`Kalendarz_Zdrowia_${pet.name}`, allPayloads);
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn text-slate-900 dark:text-slate-100">
      
      {/* Hero Header with Google Sync & Export */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-teal-600/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest uppercase text-teal-300 bg-teal-900/60 px-2.5 py-0.5 rounded-full border border-teal-500/40">
                Własny Kalendarz & Google Sync
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2 mt-1">
              <CalendarIcon className="w-6 h-6 text-teal-300" />
              Kalendarz Zdrowia: {pet.name}
            </h2>
            <p className="text-xs text-teal-100 mt-1 max-w-lg leading-relaxed">
              Przeglądaj wszystkie terminy szczepień, leków, badań i wizyt w interaktywnym kalendarzu. Każde wydarzenie możesz jednym kliknięciem przenieść do Kalendarza Google lub kalendarza w telefonie.
            </p>
          </div>

          {/* Quick sync buttons */}
          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            <button
              onClick={handleExportAllToPhoneCalendar}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md active:scale-98 transition"
            >
              <Download className="w-4 h-4" />
              Pobierz kalendarz (.ics)
            </button>
            {onOpenParasiteProtection && (
              <button
                onClick={onOpenParasiteProtection}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/20 active:scale-98 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Kleszcze & Odrobaczanie
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Month Navigation & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={handleTodayClick}
              className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition border border-slate-200 dark:border-slate-700"
            >
              Dzisiaj
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              title="Poprzedni miesiąc" aria-label="Poprzedni miesiąc"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Następny miesiąc" aria-label="Następny miesiąc"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span> Szczepienie</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Wizyta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Badanie</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Kleszcze</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span> Własne</span>
        </div>

        {/* Calendar Grid */}
        <div className="pt-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center mb-1 text-xs font-bold text-slate-400 dark:text-slate-500">
            {WEEKDAY_NAMES.map(w => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          {/* Days tiles */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cd) => {
              const dayEvents = eventsByDate.get(cd.dateStr) || [];
              const isSelected = cd.dateStr === selectedDate;
              const isToday = cd.dateStr === todayIso;

              return (
                <button
                  key={cd.dateStr}
                  onClick={() => setSelectedDate(cd.dateStr)}
                  className={`min-h-[3.25rem] sm:min-h-[4.25rem] p-1.5 rounded-2xl flex flex-col items-center justify-between text-left transition relative ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-md scale-[1.02] z-10'
                      : isToday
                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-400 dark:border-teal-700 text-teal-950 dark:text-teal-200'
                        : cd.isCurrentMonth
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-transparent text-slate-300 dark:text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${
                      isSelected ? 'text-white' : isToday ? 'text-teal-700 dark:text-teal-400' : ''
                    }`}>
                      {cd.dayNum}
                    </span>
                    {isToday && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    )}
                  </div>

                  {/* Event indicator dots */}
                  {dayEvents.length > 0 && (
                    <div className="w-full flex flex-wrap gap-1 justify-center mt-1">
                      {dayEvents.slice(0, 4).map((ev, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                            isSelected ? 'bg-white' : ev.dotColor
                          }`}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className={`text-[11px] font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Selected Day Agenda & Detail Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Selected date header & Add button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Wybrany dzień
            </span>
            <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-600" />
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pl-PL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h4>
          </div>

          <button
            onClick={() => setIsAddingEvent(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 py-2 px-3.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Dodaj wydarzenie do tego dnia
          </button>
        </div>

        {/* Events list for selected date */}
        {selectedDayEvents.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
            <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Brak zaplanowanych terminów na ten dzień.
            </p>
            <button
              onClick={() => setIsAddingEvent(true)}
              className="mt-2 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              + Zaplanuj termin (groomer, waga, kontrola)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-teal-300 dark:hover:border-teal-700 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold border ${ev.badgeColor}`}>
                      {ev.badgeLabel}
                    </span>
                    <strong className="text-sm text-slate-900 dark:text-white font-extrabold">
                      {ev.title}
                    </strong>
                    {ev.time && (
                      <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal-600" />
                        {ev.time}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    {ev.details}
                  </p>
                </div>

                {/* Google Calendar & Export Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenGoogleCalendar(ev.rawPayload)}
                    title="Dodaj do Kalendarza Google"
                    className="flex items-center gap-1 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Calendar</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSingleIcs(ev.rawPayload, ev.title)}
                    title="Pobierz plik .ics"
                    className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {ev.customEventId && (
                    <button
                      onClick={() => handleDeleteCustomEvent(ev.customEventId!)}
                      title="Usuń własne wydarzenie"
                      className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Add Custom Event Modal / Popup */}
      {isAddingEvent && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 sm:p-6 text-slate-900 dark:text-white space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                Nowe wydarzenie w kalendarzu
              </h3>
              <button
                onClick={() => setIsAddingEvent(false)}
                aria-label="Zamknij"
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomEvent} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dla zwierzaka
                </label>
                <div className="font-extrabold text-sm text-teal-700 dark:text-teal-400">
                  🐾 {pet.name}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategoria wydarzenia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewCategory('groomer'); if (!newTitle) setNewTitle('Wizyta u psiego fryzjera (groomer)'); }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 font-bold transition ${
                      newCategory === 'groomer'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Scissors className="w-4 h-4" />
                    Fryzjer / Groomer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewCategory('weight'); if (!newTitle) setNewTitle('Ważenie kontrolne pupila'); }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 font-bold transition ${
                      newCategory === 'weight'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    Ważenie
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewCategory('hygiene'); if (!newTitle) setNewTitle('Czyszczenie uszu / pazurków'); }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 font-bold transition ${
                      newCategory === 'hygiene'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    Pielęgnacja
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewCategory('other'); }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 font-bold transition ${
                      newCategory === 'other'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Inne
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="calendar-field-1" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tytuł wydarzenia *
                </label>
                <input id="calendar-field-1"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Wizyta u fryzjera, Kontrola szwów, Zakup karmy"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="calendar-field-2" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data
                  </label>
                  <input id="calendar-field-2"
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="calendar-field-3" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Godzina (opcjonalnie)
                  </label>
                  <input id="calendar-field-3"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="calendar-field-4" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notatki / Adres
                </label>
                <input id="calendar-field-4"
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="np. Salon Psia Uroda ul. Kwiatowa 4"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl shadow-md transition"
                >
                  Zapisz w kalendarzu
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Anuluj
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Daily active medications reminder strip */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            Codzienny harmonogram leków (Cykliczny)
          </h4>
          <span className="text-xs text-slate-400 font-semibold">{activeMeds.length} aktywnych</span>
        </div>

        {activeMeds.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Brak aktywnych leków w bieżącym harmonogramie.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeMeds.map((med) => (
              <div
                key={med.id}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{med.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dawka: {med.dosage} • Pory: {med.timesOfDay.map(t => t.time).join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const firstTime = med.timesOfDay[0]?.time || '08:00';
                    const amount = med.timesOfDay[0]?.amount || med.dosage;
                    const payload = buildMedicationCalendarEvent(pet.name, med.name, amount, firstTime, med.instructions, true);
                    handleOpenGoogleCalendar(payload);
                  }}
                  className="p-1.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-blue-100 transition shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Cal
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
