export const BACKUP_STALE_DAYS = 7;
export const BACKUP_REMINDER_SNOOZE_DAYS = 3;
const SNOOZE_KEY = 'petcare_backup_reminder_snoozed_until';
const DAY_MS = 24 * 60 * 60 * 1000;

export type BackupState =
  | { kind: 'ok'; ageDays: number }
  | { kind: 'never' }
  | { kind: 'stale'; ageDays: number };

export function getBackupState(lastSyncTime: string | null | undefined, now: number = Date.now()): BackupState {
  const last = lastSyncTime ? Date.parse(lastSyncTime) : NaN;
  if (Number.isNaN(last)) return { kind: 'never' };
  const ageDays = Math.max(0, Math.floor((now - last) / DAY_MS));
  return ageDays >= BACKUP_STALE_DAYS ? { kind: 'stale', ageDays } : { kind: 'ok', ageDays };
}

export function isBackupReminderSnoozed(now: number = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return until > now;
  } catch {
    return false;
  }
}

export function snoozeBackupReminder(now: number = Date.now()): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(now + BACKUP_REMINDER_SNOOZE_DAYS * DAY_MS));
  } catch {
    /* ignore */
  }
}
