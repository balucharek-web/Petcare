import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { storage } from './storage';

export interface NotificationSettings {
  enabled: boolean;
  medications: boolean;
  vaccinations: boolean;
  visits: boolean;
  dailyCare: boolean;
  dailyCareTime: string; // e.g. "09:00"
}

const SETTINGS_KEY = 'petcare_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  medications: true,
  vaccinations: true,
  visits: true,
  dailyCare: true,
  dailyCareTime: '09:00',
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Initialize Notification Channels on Android with maximum reliability
 */
export async function initNotificationChannels(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'petcare_alerts',
        name: 'Powiadomienia PetCare',
        description: 'Przypomnienia o lekach, szczepieniach i wizytach pupili',
        importance: 5, // High importance (heads-up notification)
        visibility: 1, // Public on lockscreen
        vibration: true,
        lights: true,
        lightColor: '#0D9488',
      });
      console.log('[Notifications] Kanał powiadomień Android utworzony pomyślnie');
    } catch (err) {
      console.warn('[Notifications] Błąd tworzenia kanału:', err);
    }
  }
}

/**
 * Checks if notification permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }
  return false;
}

/**
 * Requests notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      const result = await LocalNotifications.requestPermissions();
      const isGranted = result.display === 'granted';
      if (isGranted) {
        await syncAllScheduledNotifications();
      }
      return isGranted;
    } catch (err) {
      console.error('[Notifications] Błąd żądania uprawnień:', err);
      return false;
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Sends an immediate push notification (e.g. test or important event)
 */
export async function sendInstantNotification(title: string, body: string, idOffset = 0): Promise<boolean> {
  let isGranted = await checkNotificationPermission();
  if (!isGranted) {
    isGranted = await requestNotificationPermission();
    if (!isGranted) return false;
  }

  const notifId = Math.floor(100000 + Math.random() * 899999) + idOffset;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: 'petcare_alerts',
            schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('[Notifications] Błąd wysyłania powiadomienia na telefon:', err);
    }
  }

  // Web Notification fallback
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
      });
      return true;
    } catch (e) {
      console.warn('Web notification error:', e);
    }
  }

  return false;
}

/**
 * Synchronizes and schedules all upcoming reminders for medications, vaccines and visits
 * Accurately handles custom dosage hours, daily repetition and multiple pets.
 */
export async function syncAllScheduledNotifications(): Promise<number> {
  const settings = getNotificationSettings();
  if (!settings.enabled) return 0;

  let isGranted = await checkNotificationPermission();
  if (!isGranted) {
    isGranted = await requestNotificationPermission();
    if (!isGranted) {
      console.warn('[Notifications] Brak uprawnień do powiadomień.');
      return 0;
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return 0;
  }

  try {
    await initNotificationChannels();

    // Cancel existing scheduled petcare notifications to prevent duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const scheduledNotifications: ScheduleOptions['notifications'] = [];
    const pets = storage.getPets();
    const petMap = new Map(pets.map(p => [p.id, p.name]));
    const now = new Date();
    let currentId = 1000;

    // 1. Medication Reminders (Calculated accurately for each dose slot in timesOfDay)
    if (settings.medications) {
      const medications = storage.getMedications();

      medications.forEach(med => {
        if (!med.isActive) return;
        const petName = petMap.get(med.petId) || 'Pupil';
        const end = med.endDate ? new Date(med.endDate) : null;
        if (end && end < now) return;

        // Default to morning 08:00 and evening 20:00 if timesOfDay is empty
        const slots = med.timesOfDay && med.timesOfDay.length > 0 
          ? med.timesOfDay 
          : [
              { id: 'def-1', label: 'Rano', time: '08:00', amount: med.dosage || '1 dawka' },
              { id: 'def-2', label: 'Wieczór', time: '20:00', amount: med.dosage || '1 dawka' },
            ];

        // Schedule for the next 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          slots.forEach(slot => {
            const timeParts = (slot.time || '08:00').split(':').map(Number);
            const hours = isNaN(timeParts[0]) ? 8 : timeParts[0];
            const minutes = isNaN(timeParts[1]) ? 0 : timeParts[1];

            const scheduledTime = new Date();
            scheduledTime.setDate(scheduledTime.getDate() + dayOffset);
            scheduledTime.setHours(hours, minutes, 0, 0);

            // Only future dates
            if (scheduledTime > now) {
              const doseDesc = slot.amount || med.dosage || 'zgodnie z zaleceniem';
              const labelDesc = slot.label ? `${slot.label} (${slot.time})` : slot.time;

              scheduledNotifications.push({
                id: currentId++,
                title: `💊 Czas na lek dla: ${petName}`,
                body: `${med.name} • ${doseDesc} • ${labelDesc}`,
                channelId: 'petcare_alerts',
                schedule: { 
                  at: scheduledTime,
                  allowWhileIdle: true 
                },
              });
            }
          });
        }
      });
    }

    // 2. Upcoming Vaccinations & Parasite Protection
    if (settings.vaccinations) {
      const vaccinations = storage.getVaccinations();

      vaccinations.forEach(vac => {
        if (vac.validUntil) {
          const dueDate = new Date(vac.validUntil);
          if (isNaN(dueDate.getTime())) return;
          const petName = petMap.get(vac.petId) || 'Pupil';

          // Reminder 3 days before
          const reminder3Days = new Date(dueDate);
          reminder3Days.setDate(reminder3Days.getDate() - 3);
          reminder3Days.setHours(10, 0, 0, 0);

          if (reminder3Days > now) {
            scheduledNotifications.push({
              id: currentId++,
              title: `💉 Zbliża się szczepienie: ${petName}`,
              body: `Szczepienie "${vac.name}" traci ważność za 3 dni (${vac.validUntil}).`,
              channelId: 'petcare_alerts',
              schedule: { at: reminder3Days, allowWhileIdle: true },
            });
          }

          // Reminder on due date
          const reminderDueDate = new Date(dueDate);
          reminderDueDate.setHours(9, 0, 0, 0);
          if (reminderDueDate > now) {
            scheduledNotifications.push({
              id: currentId++,
              title: `⚠️ Termin szczepienia dzisiaj: ${petName}`,
              body: `Dziś upływa termin ważności szczepienia "${vac.name}".`,
              channelId: 'petcare_alerts',
              schedule: { at: reminderDueDate, allowWhileIdle: true },
            });
          }
        }
      });
    }

    // 3. Vet Visits
    if (settings.visits) {
      const visits = storage.getVisits();

      visits.forEach(visit => {
        const visitDateStr = visit.nextAppointmentDate || visit.date;
        if (visitDateStr) {
          const visitDate = new Date(visitDateStr);
          if (isNaN(visitDate.getTime())) return;
          const petName = petMap.get(visit.petId) || 'Pupil';

          // Alert 1 day before
          const reminderDate = new Date(visitDate);
          reminderDate.setDate(reminderDate.getDate() - 1);
          reminderDate.setHours(11, 0, 0, 0);

          if (reminderDate > now) {
            scheduledNotifications.push({
              id: currentId++,
              title: `🩺 Wizyta weterynaryjna jutro: ${petName}`,
              body: `${visit.clinic || 'Lecznica'} (${visitDateStr}) • Powód: ${visit.reason || 'Kontrola'}`,
              channelId: 'petcare_alerts',
              schedule: { at: reminderDate, allowWhileIdle: true },
            });
          }
        }
      });
    }

    // Limit to 50 scheduled notifications to stay well within OS limits
    const toSchedule = scheduledNotifications.slice(0, 50);

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: toSchedule,
      });
      console.log(`[Notifications] Pomyślnie zaplanowano ${toSchedule.length} powiadomień w systemie Android.`);
    }

    return toSchedule.length;
  } catch (err) {
    console.warn('[Notifications] Błąd planowania powiadomień:', err);
    return 0;
  }
}
