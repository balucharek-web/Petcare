import React from 'react';
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  Download, 
  Syringe, 
  Pill, 
  Stethoscope, 
  FileSearch, 
  Clock, 
  Check, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  Pet, 
  Vaccination, 
  Medication, 
  MedicalExam, 
  VetVisit 
} from '../types/pet';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  buildVaccinationCalendarEvent,
  buildVetVisitCalendarEvent,
  buildMedicationCalendarEvent,
  CalendarEventPayload
} from '../services/calendar';

interface CalendarHubViewProps {
  pet: Pet;
  vaccinations: Vaccination[];
  medications: Medication[];
  exams: MedicalExam[];
  visits: VetVisit[];
}

export const CalendarHubView: React.FC<CalendarHubViewProps> = ({
  pet,
  vaccinations,
  medications,
  exams,
  visits,
}) => {
  // Aggregate all events
  const eventsList: {
    id: string;
    type: 'vaccine' | 'visit' | 'exam' | 'medication';
    title: string;
    date: string;
    time?: string;
    details: string;
    rawPayload: CalendarEventPayload;
  }[] = [];

  // Vaccinations
  vaccinations.forEach((v) => {
    eventsList.push({
      id: `ev-vac-${v.id}`,
      type: 'vaccine',
      title: `Szczepienie: ${v.name}`,
      date: v.validUntil,
      time: '09:00',
      details: `Termin ważności szczepionki. Gabinet: ${v.vetClinic || 'Weterynarz'}`,
      rawPayload: buildVaccinationCalendarEvent(pet.name, v.name, v.validUntil, v.vetClinic),
    });
  });

  // Vet Visits
  visits.forEach((v) => {
    if (v.nextAppointmentDate) {
      eventsList.push({
        id: `ev-vis-next-${v.id}`,
        type: 'visit',
        title: `Wizyta: ${v.reason}`,
        date: v.nextAppointmentDate,
        time: v.time || '10:00',
        details: `Kolejna zaplanowana wizyta w: ${v.clinic}`,
        rawPayload: buildVetVisitCalendarEvent(pet.name, `Kolejna wizyta: ${v.reason}`, v.nextAppointmentDate, v.time, v.clinic, v.notes),
      });
    }
  });

  // Diagnostic control dates
  exams.forEach((ex) => {
    if (ex.nextRecommendedDate) {
      eventsList.push({
        id: `ev-exam-${ex.id}`,
        type: 'exam',
        title: `Kontrola badania: ${ex.title}`,
        date: ex.nextRecommendedDate,
        time: '11:00',
        details: `Zalecana kontrola laboratoryjna: ${ex.summary.slice(0, 70)}...`,
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

  // Daily Active Medications
  const activeMeds = medications.filter(m => m.isActive);

  // Sort upcoming events by date
  eventsList.sort((a, b) => a.date.localeCompare(b.date));

  // Export ALL upcoming events to one single .ics file
  const handleExportAllToPhoneCalendar = () => {
    const allPayloads: CalendarEventPayload[] = [
      ...eventsList.map(e => e.rawPayload),
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

  const handleOpenGoogleCalendarSingle = (payload: CalendarEventPayload) => {
    const url = createGoogleCalendarUrl(payload);
    window.open(url, '_blank');
  };

  const handleDownloadPhoneCalendarSingle = (payload: CalendarEventPayload, title: string) => {
    downloadICalendarFile(`Termin_${pet.name}_${title.replace(/\s+/g, '_')}`, [payload]);
  };

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Top Banner with 1-Tap Sync to Android & Google */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-teal-300">
              Integracja Kalendarza
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2 mt-0.5">
              <CalendarIcon className="w-6 h-6 text-teal-400" />
              Kalendarz i Przypomnienia: {pet.name}
            </h2>
            <p className="text-xs text-teal-100 mt-1 max-w-md leading-relaxed">
              Dodaj powiadomienia o podaniu leków, terminach szczepień i wizytach bezpośrednio do aplikacji Kalendarza w telefonie lub Kalendarza Google.
            </p>
          </div>
        </div>

        {/* Global Export Button */}
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-teal-200">
              Łącznie zaplanowanych terminów: <strong className="text-white">{eventsList.length}</strong>
            </span>
            <span className="text-teal-200">
              Leki codzienne: <strong className="text-white">{activeMeds.length}</strong>
            </span>
          </div>

          <button
            onClick={handleExportAllToPhoneCalendar}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-md active:scale-98 transition"
          >
            <Download className="w-4 h-4" />
            Eksportuj wszystkie terminy do Kalendarza w telefonie (.ics)
          </button>
        </div>
      </div>

      {/* Medications Daily Reminders Section */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            Codzienne przypomnienia o lekach
          </h3>
          <span className="text-xs text-slate-400">Cykliczne (codziennie)</span>
        </div>

        {activeMeds.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Brak aktywnych leków wymagających przypomnień.</p>
        ) : (
          <div className="space-y-2">
            {activeMeds.map((med) => (
              <div
                key={med.id}
                className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{med.name}</span>
                    <span className="text-slate-500">({med.dosage})</span>
                  </div>
                  <div className="flex gap-2 text-slate-600 mt-1">
                    {med.timesOfDay.map(t => (
                      <span key={t.id} className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-semibold text-[11px] text-teal-800">
                        {t.label} {t.time}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const ev = buildMedicationCalendarEvent(
                        pet.name,
                        med.name,
                        med.dosage,
                        med.timesOfDay[0]?.time || '08:00',
                        med.instructions,
                        true
                      );
                      handleOpenGoogleCalendarSingle(ev);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Google
                  </button>
                  <button
                    onClick={() => {
                      const events = med.timesOfDay.map(s => 
                        buildMedicationCalendarEvent(pet.name, med.name, s.amount, s.time, med.instructions, true)
                      );
                      downloadICalendarFile(`Lek_${pet.name}_${med.name.replace(/\s+/g, '_')}`, events);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Telefon (.ics)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Single Events List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900 px-1 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-teal-600" />
          Nadchodzące terminy i ważne daty
        </h3>

        {eventsList.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">Brak zaplanowanych terminów</p>
            <p className="text-xs text-slate-400 mt-1">
              Wprowadź szczepienia z datą ważności lub zaplanuj kolejną wizytę, aby pojawiły się w kalendarzu.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {eventsList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700 shrink-0">
                    {item.type === 'vaccine' ? (
                      <Syringe className="w-5 h-5 text-teal-600" />
                    ) : item.type === 'visit' ? (
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileSearch className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {item.type === 'vaccine' ? 'Szczepienie' : item.type === 'visit' ? 'Wizyta' : 'Badanie'}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{item.details}</p>
                    <div className="flex items-center gap-2 text-slate-400 mt-1 font-semibold text-[11px]">
                      <span>📅 {item.date}</span>
                      {item.time && <span>⏰ {item.time}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleOpenGoogleCalendarSingle(item.rawPayload)}
                    title="Dodaj do Kalendarza Google"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Google Kalendarz
                  </button>
                  <button
                    onClick={() => handleDownloadPhoneCalendarSingle(item.rawPayload, item.title)}
                    title="Pobierz plik do kalendarza w telefonie (.ics)"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    W telefonie (.ics)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
