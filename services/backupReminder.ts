/**
 * Remembers when the last Full Backup was made, so the app can remind the user.
 *
 * Stored in localStorage (same origin as the IndexedDB collection, so it is cleared
 * together with it). Storage can be unavailable (private mode, blocked site data):
 * every access is guarded and the reminder simply degrades to "never backed up".
 */

const STORAGE_KEY = 'vinyl-vault-last-backup';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days after which a backup is considered overdue. */
export const BACKUP_REMINDER_DAYS = 30;

export const recordBackupDone = (date: Date = new Date()): void => {
  try {
    localStorage.setItem(STORAGE_KEY, date.toISOString());
  } catch {
    // Storage unavailable: nothing to remember.
  }
};

export const getLastBackupDate = (): Date | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/** Whole days between `date` and `now` (0 for the same day or a future date). */
export const daysSince = (date: Date, now: Date = new Date()): number =>
  Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));

/** True when there has never been a backup, or the last one is too old. */
export const isBackupOverdue = (last: Date | null, now: Date = new Date()): boolean =>
  last === null || daysSince(last, now) >= BACKUP_REMINDER_DAYS;

/** Human-friendly age of the last backup, e.g. "today", "yesterday", "12 days ago". */
export const describeBackupAge = (last: Date, now: Date = new Date()): string => {
  const days = daysSince(last, now);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};
