export interface CalendarEventPayload {
  title: string;
  description: string;
  location?: string;
  startDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  endDate?: string;
  isAllDay?: boolean;
  recurrenceRule?: string; // np. RRULE:FREQ=DAILY
  alarmMinutesBefore?: number; // default 15
}

function formatGoogleDate(dateStr: string, isAllDay: boolean, timeStr?: string): string {
  // If isAllDay, Google expects YYYYMMDD / YYYYMMDD
  if (isAllDay) {
    const clean = dateStr.replace(/[-:]/g, '').slice(0, 8);
    // Google all-day end date is exclusive, so add 1 day or repeat clean
    return clean;
  }
  
  if (timeStr && !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('-');
    const [hour, minute] = timeStr.split(':');
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr.replace(/[-:]/g, '');
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Creates a direct Google Calendar Web URL
 */
export function createGoogleCalendarUrl(payload: CalendarEventPayload): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  let datesParam = '';
  if (payload.isAllDay) {
    const startClean = payload.startDate.replace(/[-:]/g, '').slice(0, 8);
    // For all day end date + 1 day
    const startDateObj = new Date(payload.startDate);
    startDateObj.setDate(startDateObj.getDate() + 1);
    const endClean = startDateObj.toISOString().slice(0, 10).replace(/[-:]/g, '');
    datesParam = `${startClean}/${endClean}`;
  } else {
    const startFormatted = formatGoogleDate(payload.startDate, false);
    const endFormatted = payload.endDate 
      ? formatGoogleDate(payload.endDate, false)
      : formatGoogleDate(new Date(new Date(payload.startDate).getTime() + 30 * 60 * 1000).toISOString(), false);
    datesParam = `${startFormatted}/${endFormatted}`;
  }

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', payload.title);
  params.set('details', payload.description);
  params.set('dates', datesParam);

  if (payload.location) {
    params.set('location', payload.location);
  }

  if (payload.recurrenceRule) {
    // Google expects recur=RRULE:FREQ=DAILY
    params.set('recur', payload.recurrenceRule.startsWith('RRULE:') ? payload.recurrenceRule : `RRULE:${payload.recurrenceRule}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Formats date into iCal UTC timestamp
 */
function formatICalDate(dateStr: string, isAllDay: boolean, timeStr?: string): string {
  if (isAllDay) {
    return dateStr.replace(/[-:]/g, '').slice(0, 8);
  }
  let d: Date;
  if (timeStr && !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('-');
    const [hour, minute] = timeStr.split(':');
    d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  } else {
    d = new Date(dateStr);
  }
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

/**
 * Generates an RFC 5545 .ics string with reminders/alarms
 */
export function generateICalendarString(events: CalendarEventPayload[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const icsLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PetCare Android App//Pet Health Manager//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PetCare - Zdrowie Zwierzaka',
    'X-WR-TIMEZONE:Europe/Warsaw',
  ];

  events.forEach((event, index) => {
    const uid = `petcare-${Date.now()}-${index}@petcare.app`;
    const isAllDay = !!event.isAllDay;
    const startStr = formatICalDate(event.startDate, isAllDay);
    const endStr = event.endDate 
      ? formatICalDate(event.endDate, isAllDay)
      : isAllDay 
        ? formatICalDate(event.startDate, isAllDay) 
        : formatICalDate(new Date(new Date(event.startDate).getTime() + 30 * 60 * 1000).toISOString(), false);

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${now}`);
    
    if (isAllDay) {
      icsLines.push(`DTSTART;VALUE=DATE:${startStr}`);
      icsLines.push(`DTEND;VALUE=DATE:${endStr}`);
    } else {
      icsLines.push(`DTSTART:${startStr}`);
      icsLines.push(`DTEND:${endStr}`);
    }

    icsLines.push(`SUMMARY:${escapeICalText(event.title)}`);
    icsLines.push(`DESCRIPTION:${escapeICalText(event.description)}`);

    if (event.location) {
      icsLines.push(`LOCATION:${escapeICalText(event.location)}`);
    }

    if (event.recurrenceRule) {
      const rule = event.recurrenceRule.startsWith('RRULE:') ? event.recurrenceRule : `RRULE:${event.recurrenceRule}`;
      icsLines.push(rule);
    }

    // Alarm reminder
    const alarmMin = event.alarmMinutesBefore ?? (isAllDay ? 540 : 15); // for all-day: 9h before, or 15m before
    icsLines.push('BEGIN:VALARM');
    icsLines.push(`TRIGGER:-PT${alarmMin}M`);
    icsLines.push('ACTION:DISPLAY');
    icsLines.push(`DESCRIPTION:Przypomnienie: ${escapeICalText(event.title)}`);
    icsLines.push('END:VALARM');

    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Triggers instant download of .ics file which natively opens on Android/iOS/Desktop
 */
export function downloadICalendarFile(filename: string, events: CalendarEventPayload[]): void {
  const icsContent = generateICalendarString(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to build calendar payload for Medication dose
 */
export function buildMedicationCalendarEvent(
  petName: string,
  medicationName: string,
  doseAmount: string,
  timeOfDay: string,
  instructions?: string,
  isRecurringDaily = true
): CalendarEventPayload {
  const today = new Date();
  const [hour, minute] = timeOfDay.split(':').map(Number);
  today.setHours(hour || 8, minute || 0, 0, 0);

  const startIso = today.toISOString();
  const endIso = new Date(today.getTime() + 15 * 60 * 1000).toISOString();

  return {
    title: `🐾 ${petName}: Lek ${medicationName} (${doseAmount})`,
    description: `Podanie leku dla zwierzaka: ${petName}\nLek: ${medicationName}\nDawka: ${doseAmount}\nGodzina: ${timeOfDay}\nZalecenia: ${instructions || 'Brak dodatkowych uwag'}\n\nZapisano z aplikacji PetCare.`,
    startDate: startIso,
    endDate: endIso,
    isAllDay: false,
    recurrenceRule: isRecurringDaily ? 'FREQ=DAILY' : undefined,
    alarmMinutesBefore: 10,
  };
}

/**
 * Helper to build calendar payload for Vaccination
 */
export function buildVaccinationCalendarEvent(
  petName: string,
  vaccineName: string,
  dueDate: string,
  clinicName?: string
): CalendarEventPayload {
  return {
    title: `💉 ${petName}: Szczepienie przypominające - ${vaccineName}`,
    description: `Wymagane szczepienie dla: ${petName}\nRodzaj szczepionki: ${vaccineName}\nTermin ważności mija: ${dueDate}\nKlinika: ${clinicName || 'Gabinet weterynaryjny'}\n\nNie zapomnij zabrać ze sobą książeczki zdrowia!`,
    startDate: `${dueDate}T09:00:00`,
    endDate: `${dueDate}T09:45:00`,
    location: clinicName || 'Klinika Weterynaryjna',
    isAllDay: true,
    alarmMinutesBefore: 1440, // 24 hours before
  };
}

/**
 * Helper to build calendar payload for Vet Visit
 */
export function buildVetVisitCalendarEvent(
  petName: string,
  reason: string,
  date: string,
  time?: string,
  clinicName?: string,
  notes?: string
): CalendarEventPayload {
  const timeStr = time || '10:00';
  const startIso = `${date}T${timeStr}:00`;
  const [h, m] = timeStr.split(':').map(Number);
  const endHours = String(h + 1).padStart(2, '0');
  const endIso = `${date}T${endHours}:${String(m).padStart(2, '0')}:00`;

  return {
    title: `🏥 ${petName}: Wizyta weterynaryjna - ${reason}`,
    description: `Wizyta weterynaryjna ze zwierzakiem: ${petName}\nCel wizyty: ${reason}\nKlinika: ${clinicName || 'Gabinet weterynaryjny'}\nNotatki: ${notes || '-'}\n\nPetCare Health Manager`,
    startDate: startIso,
    endDate: endIso,
    location: clinicName || 'Klinika Weterynaryjna',
    isAllDay: false,
    alarmMinutesBefore: 60, // 1 hour before
  };
}

/**
 * Helper to build calendar payload for Parasite & Tick Protection
 */
export function buildParasiteCalendarEvent(
  petName: string,
  productName: string,
  type: 'tick_flea' | 'deworming' | 'heartworm',
  validUntil: string,
  form: string
): CalendarEventPayload {
  const typeLabel = 
    type === 'tick_flea' ? 'Ochrona przed kleszczami i pchłami' :
    type === 'deworming' ? 'Odrobaczanie wewnętrzne' : 'Ochrona przed nicieniami / pasożytami';
  
  const icon = type === 'tick_flea' ? '🛡️' : '🪱';

  return {
    title: `${icon} ${petName}: ${typeLabel} - ${productName}`,
    description: `Przypomnienie o ponownym podaniu preparatu dla: ${petName}\nPreparat: ${productName} (forma: ${form})\nRodzaj: ${typeLabel}\nKoniec poprzedniej dawki: ${validUntil}\n\nPetCare Parasite Protection Hub.`,
    startDate: `${validUntil}T09:00:00`,
    endDate: `${validUntil}T09:30:00`,
    isAllDay: true,
    alarmMinutesBefore: 1440, // 1 day before
  };
}

/**
 * Helper to build calendar payload for Custom In-App Event
 */
export function buildCustomCalendarEvent(
  petName: string,
  title: string,
  date: string,
  time?: string,
  category?: string,
  notes?: string
): CalendarEventPayload {
  const timeStr = time || '10:00';
  const startIso = `${date}T${timeStr}:00`;
  const [h, m] = timeStr.split(':').map(Number);
  const endHours = String(h + 1).padStart(2, '0');
  const endIso = `${date}T${endHours}:${String(m).padStart(2, '0')}:00`;

  return {
    title: `📅 ${petName}: ${title}`,
    description: `Wydarzenie dla: ${petName}\nKategoria: ${category || 'Wydarzenie ogólne'}\nNotatki: ${notes || '-'}\n\nZapisano w kalendarzu PetCare.`,
    startDate: startIso,
    endDate: endIso,
    isAllDay: !time,
    alarmMinutesBefore: 60,
  };
}
