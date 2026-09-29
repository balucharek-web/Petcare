import { Vaccination, Medication, VetVisit, MedicalExam, Pet } from '../types/pet';

export interface AlertItem {
  id: string;
  type: 'vaccine' | 'deworming' | 'medication' | 'visit' | 'exam';
  title: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
  severity: 'urgent' | 'warning' | 'info';
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

  // 1. Vaccinations & Deworming
  vaccinations.forEach((v) => {
    const exp = new Date(v.validUntil);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const isDeworming = v.category === 'deworming';
    const isAntiParasitic = v.category === 'antiparasitic';

    if (diffDays <= 30) {
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
        id: `alert-vac-${v.id}`,
        type: isDeworming ? 'deworming' : 'vaccine',
        title,
        description: `Ważność mija: ${v.validUntil} (jeszcze ${diffDays < 0 ? 'przeterminowane o ' + Math.abs(diffDays) : diffDays} dni)`,
        dueDate: v.validUntil,
        daysRemaining: diffDays,
        severity,
      });
    }
  });

  // 2. Upcoming Vet Visits (within 7 days)
  visits.forEach((vis) => {
    const targetDate = vis.nextAppointmentDate;
    if (targetDate) {
      const vDate = new Date(targetDate);
      vDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((vDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 7) {
        alerts.push({
          id: `alert-visit-${vis.id}`,
          type: 'visit',
          title: `Zaplanowana wizyta za ${diffDays === 0 ? 'dzisiaj' : diffDays + ' dni'}`,
          description: `${vis.reason} w ${vis.clinic || 'Klinice'}${vis.time ? ' o godz. ' + vis.time : ''}`,
          dueDate: targetDate,
          daysRemaining: diffDays,
          severity: diffDays <= 1 ? 'urgent' : 'warning',
        });
      }
    }
  });

  // 3. Upcoming Recommended Exams
  exams.forEach((ex) => {
    if (ex.nextRecommendedDate) {
      const eDate = new Date(ex.nextRecommendedDate);
      eDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 14) {
        alerts.push({
          id: `alert-exam-${ex.id}`,
          type: 'exam',
          title: diffDays < 0 ? `Zalecana kontrola badania` : `Badanie kontrolne za ${diffDays} dni`,
          description: `${ex.title} (zalecany termin: ${ex.nextRecommendedDate})`,
          dueDate: ex.nextRecommendedDate,
          daysRemaining: diffDays,
          severity: diffDays <= 3 ? 'urgent' : 'info',
        });
      }
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
