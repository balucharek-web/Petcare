import { Vaccination, Medication, VetVisit, MedicalExam, Pet } from '../types/pet';

import { storage } from './storage';

export interface AlertItem {
  id: string;
  type: 'vaccine' | 'deworming' | 'medication' | 'visit' | 'exam';
  title: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
  severity: 'urgent' | 'warning' | 'info';
  petId?: string;
  petName?: string;
}

/**
 * Checks all medical entries and returns items requiring user attention
 */
export function getUpcomingAlerts(
  pet: Pet | null,
  vaccinations: Vaccination[],
  medications: Medication[],
  visits: VetVisit[],
  exams: MedicalExam[]
): AlertItem[] {
  if (!pet) return [];

  const alerts: AlertItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dismissedIds = new Set(storage.getDismissedAlertIds());

  // 1. Vaccinations & Deworming
  vaccinations.forEach((v) => {
    if (!v.validUntil) return;
    const exp = new Date(v.validUntil);
    if (isNaN(exp.getTime())) return;
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Only alert if within 30 days ahead, and not older than 120 days overdue
    if (diffDays <= 30 && diffDays >= -120) {
      const alertId = `alert-vac-${v.id}`;
      if (dismissedIds.has(alertId)) return;

      const isDeworming = v.category === 'deworming';
      const isAntiParasitic = v.category === 'antiparasitic';

      let severity: AlertItem['severity'] = 'info';
      let title = '';

      if (diffDays < 0) {
        severity = 'urgent';
        title = isDeworming
          ? `Zaległe odrobaczenie (${v.name})`
          : isAntiParasitic
          ? `Wygasła ochrona na kleszcze (${v.name})`
          : `Przeterminowane szczepienie (${v.name})`;
      } else if (diffDays <= 7) {
        severity = 'urgent';
        title = isDeworming
          ? `Odrobaczenie za ${diffDays} dni (${v.name})`
          : `Szczepienie za ${diffDays} dni (${v.name})`;
      } else {
        severity = 'warning';
        title = isDeworming
          ? `Zbliża się odrobaczenie (${v.name})`
          : `Zbliża się termin szczepienia (${v.name})`;
      }

      alerts.push({
        id: alertId,
        type: isDeworming ? 'deworming' : 'vaccine',
        title,
        description: `Ważność: ${v.validUntil} (${diffDays < 0 ? 'przeterminowane o ' + Math.abs(diffDays) + ' dni' : 'pozostało ' + diffDays + ' dni'})`,
        dueDate: v.validUntil,
        daysRemaining: diffDays,
        severity,
        petId: pet.id,
        petName: pet.name,
      });
    }
  });

  // 2. Upcoming Vet Visits (within 7 days)
  visits.forEach((vis) => {
    const targetDate = vis.nextAppointmentDate;
    if (targetDate) {
      const vDate = new Date(targetDate);
      if (isNaN(vDate.getTime())) return;
      vDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) {
        const alertId = `alert-visit-${vis.id}`;
        if (dismissedIds.has(alertId)) return;

        alerts.push({
          id: alertId,
          type: 'visit',
          title: `Zaplanowana wizyta: ${diffDays === 0 ? 'dzisiaj' : 'za ' + diffDays + ' dni'}`,
          description: `${vis.reason || 'Kontrola'} w ${vis.clinic || 'Klinice'}${vis.time ? ' o godz. ' + vis.time : ''}`,
          dueDate: targetDate,
          daysRemaining: diffDays,
          severity: diffDays <= 1 ? 'urgent' : 'warning',
          petId: pet.id,
          petName: pet.name,
        });
      }
    }
  });

  // 3. Upcoming Recommended Exams (within 14 days, max 30 days overdue)
  exams.forEach((ex) => {
    if (ex.nextRecommendedDate) {
      const eDate = new Date(ex.nextRecommendedDate);
      if (isNaN(eDate.getTime())) return;
      eDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 14 && diffDays >= -30) {
        const alertId = `alert-exam-${ex.id}`;
        if (dismissedIds.has(alertId)) return;

        alerts.push({
          id: alertId,
          type: 'exam',
          title: diffDays < 0 ? `Zaległe badanie kontrolne` : `Badanie kontrolne za ${diffDays} dni`,
          description: `${ex.title} (termin: ${ex.nextRecommendedDate})`,
          dueDate: ex.nextRecommendedDate,
          daysRemaining: diffDays,
          severity: diffDays <= 3 ? 'urgent' : 'info',
          petId: pet.id,
          petName: pet.name,
        });
      }
    }
  });

  // 4. Low stock medications
  medications.forEach((med) => {
    if (med.isActive && med.currentStock !== undefined && med.currentStock <= 3 && med.currentStock >= 0) {
      const alertId = `alert-med-stock-${med.id}`;
      if (dismissedIds.has(alertId)) return;

      alerts.push({
        id: alertId,
        type: 'medication',
        title: `Kończy się lek: ${med.name}`,
        description: `Zostało tylko ${med.currentStock} dawek/tabletek w apteczce.`,
        dueDate: today.toISOString().slice(0, 10),
        daysRemaining: 0,
        severity: med.currentStock <= 1 ? 'urgent' : 'warning',
        petId: pet.id,
        petName: pet.name,
      });
    }
  });

  // Sort by urgency (urgent first, then lowest daysRemaining)
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const res = await Notification.requestPermission();
    return res;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Triggers a native system notification if permission is granted
 */
export function sendLocalNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icon.svg',
        badge: '/icon.svg',
        ...options,
      });
      return true;
    } catch (err) {
      console.warn('Notification trigger warning:', err);
    }
  }

  return false;
}
