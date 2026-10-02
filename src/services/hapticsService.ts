/**
 * Haptic Feedback Engine for PetCare Mobile App
 * Provides native tactile vibration feedback on Android & iOS mobile devices
 */

class HapticsService {
  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Light micro-pulse for normal button taps and switches (~12ms)
   */
  tap(): void {
    if (!this.isAvailable()) return;
    try {
      navigator.vibrate(12);
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Selection pulse for drag & drop or tile reordering (~20ms)
   */
  selection(): void {
    if (!this.isAvailable()) return;
    try {
      navigator.vibrate(22);
    } catch {}
  }

  /**
   * Double rhythmic pulse for completing an action, e.g. dose administered, photo saved [15ms, 40ms pause, 25ms]
   */
  success(): void {
    if (!this.isAvailable()) return;
    try {
      navigator.vibrate([15, 40, 25]);
    } catch {}
  }

  /**
   * Triple warning pulse for allergen alerts or overdue deadlines [30ms, 40ms pause, 30ms]
   */
  warning(): void {
    if (!this.isAvailable()) return;
    try {
      navigator.vibrate([30, 40, 30]);
    } catch {}
  }

  /**
   * Heavy pulse for deletion or emergency actions [45ms, 50ms pause, 45ms]
   */
  danger(): void {
    if (!this.isAvailable()) return;
    try {
      navigator.vibrate([45, 50, 45]);
    } catch {}
  }
}

export const haptics = new HapticsService();
