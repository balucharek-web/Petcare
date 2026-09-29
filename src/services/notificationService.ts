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
 * Initialize Notification Channels on Android
 */
export async function initNotificationChannels(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'petcare_alerts',
        name: 'Powiadomienia PetCare',
        description: 'Przypomnienia o lekach, szczepieniach i wizytach pupili',
        importance: 5, // High importance
        visibility: 1, // Public
        sound: 'res_custom_notification',
        vibration: true,
        lights: true,
        lightColor: '#0D9488',
      });
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
      return result.display === 'granted';
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
  const isGranted = await checkNotificationPermission();
  if (!isGranted) {
    const requested = await requestNotificationPermission();
    if (!requested) return false;
  }

  const notifId = Math.floor(100000 + Math.random() * 899999) + idOffset;

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: 'petcare_alerts',
            smallIcon: 'ic_launcher_foreground',
            largeIcon: 'ic_launcher',
            iconColor: '#0D9488',
            schedule: { at: new Date(Date.now() + 800) },
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
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
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
 */
export async function syncAllScheduledNotifications(): Promise<number> {
  const settings = getNotificationSettings();
  if (!settings.enabled) return 0;

  const isGranted = await checkNotificationPermission();
  if (!isGranted) return 0;

  if (!Capacitor.isNativePlatform()) return 0;

  try {
    // Cancel existing scheduled petcare notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const scheduledNotifications: ScheduleOptions['notifications'] = [];
    const pets = storage.getPets();
    const petMap = new Map(pets.map(p => [p.id, p.name]));

    let currentId = 1000;

    // 1. Medication Reminders
    if (settings.medications) {
      const medications = storage.getMedications();
      const now = new Date();

      medications.forEach(med => {
        const petName = petMap.get(med.petId) || 'Pupil';
        // If medication is still active
        const end = med.endDate ? new Date(med.endDate) : null;
        if (!end || end >= now) {
          // Schedule for tomorrow 09:00 and 19:00
          for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
            const morning = new Date();
            morning.setDate(morning.getDate() + dayOffset);
            morning.setHours(9, 0, 0, 0);

            if (morning > now) {
              scheduledNotifications.push({
                id: currentId++,
                title: `💊 Czas na lek dla: ${petName}`,
                body: `${med.name} - dawka: ${med.dosage || 'zgodnie z zaleceniem'}`,
                channelId: 'petcare_alerts',
                smallIcon: 'ic_launcher_foreground',
                schedule: { at: morning },
              });
            }
          }
        }
      });
    }

    // 2. Upcoming Vaccinations
    if (settings.vaccinations) {
      const vaccinations = storage.getVaccinations();
      const now = new Date();

      vaccinations.forEach(vac => {
        if (vac.validUntil) {
          const dueDate = new Date(vac.validUntil);
          const petName = petMap.get(vac.petId) || 'Pupil';

          // Reminder 2 days before
          const reminderDate = new Date(dueDate);
          reminderDate.setDate(reminderDate.getDate() - 2);
          reminderDate.setHours(10, 0, 0, 0);

          if (reminderDate > now) {
            scheduledNotifications.push({
              id: currentId++,
              title: `💉 Zbliża się szczepienie: ${petName}`,
              body: `Szczepienie "${vac.name}" traci ważność za 2 dni (${vac.validUntil}).`,
              channelId: 'petcare_alerts',
              smallIcon: 'ic_launcher_foreground',
              schedule: { at: reminderDate },
            });
          }
        }
      });
    }

    // 3. Vet Visits
    if (settings.visits) {
      const visits = storage.getVisits();
      const now = new Date();

      visits.forEach(visit => {
        if (visit.date) {
          const visitDate = new Date(visit.date);
          const petName = petMap.get(visit.petId) || 'Pupil';

          // Alert 1 day before
          const reminderDate = new Date(visitDate);
          reminderDate.setDate(reminderDate.getDate() - 1);
          reminderDate.setHours(12, 0, 0, 0);

          if (reminderDate > now) {
            scheduledNotifications.push({
              id: currentId++,
              title: `🩺 Wizyta weterynaryjna: ${petName}`,
              body: `Zaplanowano wizytę: ${visit.clinic || 'Lecznica'} (${visit.date}). Powód: ${visit.reason || 'Kontrola'}`,
              channelId: 'petcare_alerts',
              smallIcon: 'ic_launcher_foreground',
              schedule: { at: reminderDate },
            });
          }
        }
      });
    }

    if (scheduledNotifications.length > 0) {
      await LocalNotifications.schedule({
        notifications: scheduledNotifications.slice(0, 30), // Max 30 scheduled alarms
      });
    }

    return scheduledNotifications.length;
  } catch (err) {
    console.warn('[Notifications] Błąd planowania powiadomień:', err);
    return 0;
  }
}
