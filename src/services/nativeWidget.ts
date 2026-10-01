import { registerPlugin, Capacitor } from '@capacitor/core';
import { storage, subscribeToStorageChanges } from './storage';
import { Pet, Medication } from '../types/pet';

export interface NativeWidgetPluginInterface {
  updateWidgetData(options: {
    petName: string;
    petSubtext: string;
    taskHeadline: string;
    preventionStatus: string;
    badge: string;
  }): Promise<{ success: boolean }>;

  isPinningSupported(): Promise<{ supported: boolean }>;

  pinWidget(): Promise<{ requested: boolean; fallbackGuideRequired?: boolean }>;
}

export const NativeWidget = registerPlugin<NativeWidgetPluginInterface>('NativeWidgetPlugin');

/**
 * Updates the native Android Home Screen Widget with real-time data from local storage
 */
export async function syncWidgetWithLatestData(): Promise<void> {
  if (!Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'android') {
    return;
  }

  try {
    const pets: Pet[] = storage.getPets();
    const activePetId = storage.getActivePetId();
    const activePet = pets.find((p) => p.id === activePetId) || pets[0];

    if (!activePet) {
      await NativeWidget.updateWidgetData({
        petName: 'PetCare',
        petSubtext: 'Brak profilu zwierzaka',
        taskHeadline: 'Dodaj swojego pupila w aplikacji',
        preventionStatus: '🛡️ Dotknij, aby rozpocząć',
        badge: '🐾 Czeka na dane',
      });
      return;
    }

    // Species translation
    const speciesLabel = activePet.species === 'dog' ? 'Pies' : activePet.species === 'cat' ? 'Kot' : 'Pupil';
    const breedText = activePet.breed ? ` • ${activePet.breed}` : '';
    const petSubtext = `${speciesLabel}${breedText}`;

    // Get today's medications
    const medications: Medication[] = storage.getMedications();
    const petMeds = medications.filter((m) => m.petId === activePet.id && m.isActive);
    const today = new Date().toISOString().slice(0, 10);
    const doseLogs = storage.getDoseLogs();

    const pendingMeds = petMeds.filter((m) => {
      const isTakenToday = doseLogs.some((d) => d.medicationId === m.id && d.scheduledDate === today);
      return !isTakenToday;
    });

    let taskHeadline = 'Wszystkie dawki na dziś podane ✓';
    if (pendingMeds.length > 0) {
      const first = pendingMeds[0];
      const timeStr = first.timesOfDay && first.timesOfDay.length > 0 ? ` o ${first.timesOfDay[0].time}` : '';
      taskHeadline = `💊 Do podania: ${first.name} (${first.dosage})${timeStr}`;
      if (pendingMeds.length > 1) {
        taskHeadline += ` (+${pendingMeds.length - 1} inne)`;
      }
    }

    // Prevention status
    let preventionStatus = '🛡️ Profilaktyka pod kontrolą';
    const vacs = storage.getVaccinations().filter((v) => v.petId === activePet.id);
    const deworm = vacs.find((v) => v.category === 'deworming');
    if (deworm && deworm.dateAdministered) {
      const diffDays = Math.floor((Date.now() - new Date(deworm.dateAdministered).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        preventionStatus = `⚠️ Czas na odrobaczenie (${diffDays} dni temu)`;
      } else {
        preventionStatus = `🛡️ Odrobaczenie: ${diffDays} dni temu • OK`;
      }
    }

    await NativeWidget.updateWidgetData({
      petName: `PetCare • ${activePet.name}`,
      petSubtext,
      taskHeadline,
      preventionStatus,
      badge: pendingMeds.length > 0 ? `⚠️ ${pendingMeds.length} zadania` : '✓ Wszystko OK',
    });
  } catch (err) {
    console.warn('Błąd aktualizacji widżetu na pulpicie Androida:', err);
  }
}

/**
 * Prompts Android system to pin the PetCare AppWidget to the phone's home screen
 */
export async function pinPetCareWidgetToHomeScreen(): Promise<{ requested: boolean; fallbackGuideRequired?: boolean }> {
  try {
    if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
      const res = await NativeWidget.pinWidget();
      return res;
    }
  } catch (e) {
    console.warn('Błąd wywołania pinWidget:', e);
  }
  return { requested: false, fallbackGuideRequired: true };
}

// Automatically sync the native Android widget whenever medications, pets or doses change
if (typeof window !== 'undefined') {
  subscribeToStorageChanges((key) => {
    if (key.includes('medications') || key.includes('pets') || key.includes('dose_logs') || key.includes('vaccinations')) {
      syncWidgetWithLatestData();
    }
  });
}

