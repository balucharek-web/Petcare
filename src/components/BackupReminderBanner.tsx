import React, { useEffect, useState } from 'react';
import { CloudUpload, X } from 'lucide-react';
import { getStoredSyncMetadata, subscribeToSyncUpdates, uploadPetDataToDrive, type SyncMetadata } from '../services/googleDriveSync';
import { getBackupState, isBackupReminderSnoozed, snoozeBackupReminder } from '../services/backupStatus';

interface BackupReminderBannerProps {
  hasPets: boolean;
  onOpenGoogleSync: () => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({ hasPets, onOpenGoogleSync }) => {
  const [meta, setMeta] = useState<SyncMetadata>(() => getStoredSyncMetadata());
  const [snoozed, setSnoozed] = useState(() => isBackupReminderSnoozed());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeToSyncUpdates(setMeta), []);

  const state = getBackupState(meta.lastSyncTime);
  if (!hasPets || snoozed || state.kind === 'ok' || meta.lastSyncStatus === 'syncing') return null;

  const connected = !!meta.userEmail;
  const message = !connected
    ? 'Dane zwierzaków są tylko w tym telefonie. Włącz kopię na Dysku Google, żeby ich nie stracić.'
    : state.kind === 'never'
      ? 'Nie masz jeszcze kopii na Dysku Google.'
      : `Ostatnia kopia na Dysku Google jest sprzed ${state.ageDays} dni.`;

  const handleBackup = async () => {
    if (!connected) {
      onOpenGoogleSync();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadPetDataToDrive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać kopii. Zaloguj się ponownie do Google.');
      onOpenGoogleSync();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="mx-3 sm:mx-4 mt-3 p-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100">
      <CloudUpload className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold leading-snug">{message}</p>
        {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={handleBackup}
          disabled={busy}
          className="px-3 py-2 min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60 cursor-pointer"
        >
          {busy ? 'Zapisywanie…' : connected ? 'Zrób kopię teraz' : 'Włącz kopię na Dysku'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => { snoozeBackupReminder(); setSnoozed(true); }}
        aria-label="Przypomnij później"
        className="p-2 -m-1 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
