import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../services/db';
import { exportFullBackup, importFullBackup, normalizeRecord } from '../services/backupService';
import { confirmDialog, notify } from '../services/notify';
import { getLastBackupDate } from '../services/backupReminder';
import { makeRecord } from './fixtures';

vi.mock('../services/notify', () => ({
  notify: vi.fn(),
  confirmDialog: vi.fn(async () => true),
}));
vi.mock('../services/excelService', () => ({
  exportCollectionToExcel: vi.fn(async () => {}),
}));

const backupFile = (content: unknown) =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], 'backup.json', { type: 'application/json' });

beforeEach(async () => {
  await db.vinyls.clear();
  vi.mocked(confirmDialog).mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('normalizeRecord', () => {
  it('keeps a valid record and drops its id', () => {
    const { id: _id, ...rest } = makeRecord({ id: 42 });
    // Entries come from a parsed JSON file, so dates arrive as ISO strings.
    const fromJson = JSON.parse(JSON.stringify({ ...rest, id: 42 }));
    expect(normalizeRecord(fromJson)).toEqual(rest);
  });

  it('rejects non-objects and records without artist and album', () => {
    expect(normalizeRecord(null)).toBeNull();
    expect(normalizeRecord('text')).toBeNull();
    expect(normalizeRecord([1, 2])).toBeNull();
    expect(normalizeRecord({ genre: ['Jazz'] })).toBeNull();
    expect(normalizeRecord({ artist: '  ', album: '' })).toBeNull();
  });

  it('fills in missing artist/album and defaults', () => {
    const r = normalizeRecord({ album: 'Solo' })!;
    expect(r.artist).toBe('Unknown Artist');
    expect(r.album).toBe('Solo');
    expect(r).toMatchObject({ genre: [], label: [], catNumber: [], bestTracks: [], country: '-', releaseYear: null, rating: 0, soundQuality: 0, toBeSold: false });
    expect(r.addedAt).toBeInstanceOf(Date);
  });

  it('coerces wrong types instead of persisting them', () => {
    const r = normalizeRecord({
      artist: 123, album: 'X', genre: 'Rock; Pop', label: [1, ' ', 'EMI'], releaseYear: '1975',
      rating: '15', soundQuality: -3, toBeSold: 'yes', addedAt: 'not a date',
    })!;
    expect(r.artist).toBe('123');
    expect(r.genre).toEqual(['Rock', 'Pop']);
    expect(r.label).toEqual(['1', 'EMI']);
    expect(r.releaseYear).toBe(1975);
    expect(r.rating).toBe(10);
    expect(r.soundQuality).toBe(0);
    expect(r.toBeSold).toBe(false);
    expect(isNaN(r.addedAt.getTime())).toBe(false);
  });

  it('rejects invalid years', () => {
    expect(normalizeRecord({ artist: 'A', releaseYear: 0 })!.releaseYear).toBeNull();
    expect(normalizeRecord({ artist: 'A', releaseYear: 1975.5 })!.releaseYear).toBeNull();
    expect(normalizeRecord({ artist: 'A', releaseYear: 'abc' })!.releaseYear).toBeNull();
  });

  it('only keeps displayable covers and well-formed colors', () => {
    const ok = normalizeRecord({ artist: 'A', coverUrl: 'data:image/png;base64,AA', dominantColor: 'rgb(1, 2, 3)' })!;
    expect(ok.coverUrl).toBe('data:image/png;base64,AA');
    expect(ok.dominantColor).toBe('rgb(1, 2, 3)');
    expect(normalizeRecord({ artist: 'A', coverUrl: 'https://x.mzstatic.com/a.jpg' })!.coverUrl).toBe('https://x.mzstatic.com/a.jpg');

    const bad = normalizeRecord({ artist: 'A', coverUrl: 'javascript:alert(1)', dominantColor: 'red; background:url(x)' })!;
    expect(bad).not.toHaveProperty('coverUrl');
    expect(bad).not.toHaveProperty('dominantColor');
    expect(normalizeRecord({ artist: 'A', coverUrl: 'http://insecure/a.jpg' })).not.toHaveProperty('coverUrl');
  });

  it('keeps known moods only, and omits the field when there are none', () => {
    expect(normalizeRecord({ artist: 'A', moods: ['night', 'Party', 'Sleepy'] })!.moods).toEqual(['Night', 'Party']);
    expect(normalizeRecord({ artist: 'A', moods: ['Sleepy'] })).not.toHaveProperty('moods');
    expect(normalizeRecord({ artist: 'A' })).not.toHaveProperty('moods');
  });
});

describe('importFullBackup', () => {
  it('replaces the collection with the valid records of the backup', async () => {
    await db.vinyls.bulkAdd([makeRecord({ album: 'Old 1' }), makeRecord({ album: 'Old 2' })]);
    const backup = { version: '1.1.0', exportDate: '2025-05-01', records: [makeRecord({ album: 'New' }), { nonsense: true }] };

    await expect(importFullBackup(backupFile(backup))).resolves.toBe(true);

    expect((await db.vinyls.toArray()).map(r => r.album)).toEqual(['New']);
    expect(confirmDialog).toHaveBeenCalledWith(expect.stringContaining('1 invalid entries will be skipped'), expect.anything());
  });

  it('leaves the collection untouched when the user cancels', async () => {
    await db.vinyls.add(makeRecord({ album: 'Keep me' }));
    vi.mocked(confirmDialog).mockResolvedValue(false);

    await expect(importFullBackup(backupFile({ version: '1', records: [makeRecord({ album: 'New' })] }))).resolves.toBe(false);
    expect((await db.vinyls.toArray()).map(r => r.album)).toEqual(['Keep me']);
  });

  it('rejects files that are not Vinyl Vault backups', async () => {
    await db.vinyls.add(makeRecord({ album: 'Keep me' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importFullBackup(backupFile({ records: [] }))).resolves.toBe(false);
    await expect(importFullBackup(backupFile({ version: '1', records: 'x' }))).resolves.toBe(false);
    await expect(importFullBackup(backupFile({ version: '1', records: [{ foo: 1 }] }))).resolves.toBe(false);
    await expect(importFullBackup(backupFile('{ not json'))).rejects.toThrow();

    expect(confirmDialog).not.toHaveBeenCalled();
    expect((await db.vinyls.toArray()).map(r => r.album)).toEqual(['Keep me']);
  });

  it('is atomic: if inserting fails, the old collection survives', async () => {
    await db.vinyls.bulkAdd([makeRecord({ album: 'Old 1' }), makeRecord({ album: 'Old 2' })]);
    vi.spyOn(db.vinyls, 'bulkAdd').mockRejectedValueOnce(new Error('disk full'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(importFullBackup(backupFile({ version: '1', records: [makeRecord({ album: 'New' })] }))).rejects.toThrow('disk full');

    expect((await db.vinyls.toArray()).map(r => r.album).sort()).toEqual(['Old 1', 'Old 2']);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('was not changed'), 'error');
  });
});

describe('exportFullBackup', () => {
  it('downloads a JSON backup that restores to the same collection', async () => {
    const original = [makeRecord({ album: 'A', coverUrl: 'data:image/png;base64,AA' }), makeRecord({ album: 'B', genre: ['Rock', 'Pop'] })];
    await db.vinyls.bulkAdd(original);

    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:test'; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportFullBackup();

    expect(click).toHaveBeenCalledOnce();
    expect(getLastBackupDate()).not.toBeNull();
    const backup = JSON.parse(await blob!.text());
    expect(backup.recordCount).toBe(2);

    await db.vinyls.clear();
    await expect(importFullBackup(backupFile(backup))).resolves.toBe(true);
    const restored = (await db.vinyls.toArray()).map(({ id: _id, ...r }) => r);
    expect(restored).toEqual(original.map(({ id: _id, ...r }) => r));
  });

  it('does nothing for an empty collection', async () => {
    localStorage.clear();
    URL.createObjectURL = vi.fn();
    await exportFullBackup();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(getLastBackupDate()).toBeNull();
    expect(notify).toHaveBeenCalledWith('No records to back up.', 'info');
  });
});
