import { describe, expect, it } from 'vitest';
import { BACKUP_STALE_DAYS, getBackupState } from '../src/services/backupStatus';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-04T12:00:00Z');

describe('getBackupState', () => {
  it('reports a missing backup', () => {
    expect(getBackupState(null, now)).toEqual({ kind: 'never' });
    expect(getBackupState('not a date', now)).toEqual({ kind: 'never' });
  });

  it('treats recent backups as ok', () => {
    expect(getBackupState(new Date(now - 2 * DAY).toISOString(), now)).toEqual({ kind: 'ok', ageDays: 2 });
  });

  it('flags backups older than the threshold', () => {
    const iso = new Date(now - BACKUP_STALE_DAYS * DAY - 1000).toISOString();
    expect(getBackupState(iso, now)).toEqual({ kind: 'stale', ageDays: BACKUP_STALE_DAYS });
  });
});
