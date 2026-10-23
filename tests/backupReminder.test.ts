import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_REMINDER_DAYS, daysSince, describeBackupAge, getLastBackupDate, isBackupOverdue, recordBackupDone,
} from '../services/backupReminder';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const now = new Date('2026-10-23T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe('backup reminder', () => {
  it('remembers the date of the last backup', () => {
    expect(getLastBackupDate()).toBeNull();
    recordBackupDone(daysAgo(3));
    expect(getLastBackupDate()).toEqual(daysAgo(3));
  });

  it('ignores a corrupted stored value', () => {
    localStorage.setItem('vinyl-vault-last-backup', 'garbage');
    expect(getLastBackupDate()).toBeNull();
  });

  it('degrades gracefully when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => recordBackupDone()).not.toThrow();
    expect(getLastBackupDate()).toBeNull();
  });

  it('counts whole days and never goes negative', () => {
    expect(daysSince(daysAgo(0), now)).toBe(0);
    expect(daysSince(daysAgo(1.5), now)).toBe(1);
    expect(daysSince(daysAgo(-2), now)).toBe(0);
  });

  it(`is overdue when there is no backup or it is ${BACKUP_REMINDER_DAYS}+ days old`, () => {
    expect(isBackupOverdue(null, now)).toBe(true);
    expect(isBackupOverdue(daysAgo(BACKUP_REMINDER_DAYS - 1), now)).toBe(false);
    expect(isBackupOverdue(daysAgo(BACKUP_REMINDER_DAYS), now)).toBe(true);
  });

  it('describes the age in words', () => {
    expect(describeBackupAge(daysAgo(0), now)).toBe('today');
    expect(describeBackupAge(daysAgo(1), now)).toBe('yesterday');
    expect(describeBackupAge(daysAgo(12), now)).toBe('12 days ago');
  });
});
