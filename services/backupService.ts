import { db } from './db';
import { VinylRecord } from '../types';
import { exportCollectionToExcel } from './excelService';

/**
 * Backup file format interface
 */
interface VinylVaultBackup {
  version: string;
  exportDate: string;
  recordCount: number;
  records: VinylRecord[];
}

/**
 * Export a complete backup of the database.
 * Downloads both an Excel file (metadata only) and a JSON file (full data with images).
 */
export const exportFullBackup = async (): Promise<void> => {
  const records = await db.vinyls.toArray();
  
  if (records.length === 0) {
    alert('No records to backup.');
    return;
  }

  // 1. Export Excel (existing functionality)
  exportCollectionToExcel(records);

  // 2. Export JSON with full data including coverUrl (Base64 images)
  const backup: VinylVaultBackup = {
    version: '1.1.0',
    exportDate: new Date().toISOString(),
    recordCount: records.length,
    records: records,
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `vinyl-vault-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  alert(`Backup complete! Exported ${records.length} records.\n\nTwo files have been downloaded:\n• Excel (metadata)\n• JSON (full backup with covers)`);
};

const toStr = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : fallback);

const toStrArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(x => toStr(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(';').map(s => s.trim()).filter(Boolean);
  return [];
};

const toInt = (v: unknown, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : parseInt(toStr(v), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : 0;
};

/**
 * Coerce an untrusted backup entry into a well-formed VinylRecord.
 * Returns null for entries that are not objects or lack both artist and album.
 * This prevents a malformed backup (e.g. `genre` as a string) from being persisted
 * and crashing the collection view on every load.
 */
export const normalizeRecord = (raw: unknown): VinylRecord | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const artist = toStr(r.artist).trim();
  const album = toStr(r.album).trim();
  if (!artist && !album) return null;

  const year = r.releaseYear === null || r.releaseYear === undefined ? NaN : Number(r.releaseYear);
  const addedAt = new Date(toStr(r.addedAt));
  const coverUrl = toStr(r.coverUrl);
  const dominantColor = toStr(r.dominantColor);

  return {
    artist: artist || 'Unknown Artist',
    album: album || 'Unknown Album',
    genre: toStrArray(r.genre),
    collection: toStr(r.collection),
    releaseYear: Number.isInteger(year) && year > 0 ? year : null,
    country: toStr(r.country, '-') || '-',
    label: toStrArray(r.label),
    catNumber: toStrArray(r.catNumber),
    conditionSleeve: toStr(r.conditionSleeve),
    conditionMedia: toStr(r.conditionMedia),
    soundQuality: toInt(r.soundQuality, 0, 5),
    rating: toInt(r.rating, 0, 10),
    bestTracks: toStrArray(r.bestTracks),
    comments: toStr(r.comments),
    discogsLink: toStr(r.discogsLink),
    toBeSold: r.toBeSold === true,
    // Only keep covers the app can actually display (embedded images or HTTPS URLs).
    ...(/^(data:image\/|https:\/\/)/.test(coverUrl) ? { coverUrl } : {}),
    ...(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/.test(dominantColor) ? { dominantColor } : {}),
    addedAt: isNaN(addedAt.getTime()) ? new Date() : addedAt,
  };
};

/**
 * Import a complete backup from a JSON file.
 * This will REPLACE all existing data. The clear + insert runs in a single
 * transaction, so if anything fails the existing collection is left untouched.
 */
export const importFullBackup = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backup: VinylVaultBackup = JSON.parse(content);

        // Validate backup format
        if (!backup.version || !backup.records || !Array.isArray(backup.records)) {
          alert('Invalid backup file format. Please select a valid Vinyl Vault backup.');
          resolve(false);
          return;
        }

        // Normalize every entry (ids are dropped so Dexie auto-generates new ones)
        const recordsToAdd = backup.records
          .map(normalizeRecord)
          .filter((r): r is VinylRecord => r !== null);
        const skipped = backup.records.length - recordsToAdd.length;

        if (recordsToAdd.length === 0) {
          alert('This backup contains no valid records. Your collection was not changed.');
          resolve(false);
          return;
        }

        const exportDate = new Date(backup.exportDate);
        const confirmed = window.confirm(
          `This backup contains ${recordsToAdd.length} valid records` +
          (isNaN(exportDate.getTime()) ? '' : ` from ${exportDate.toLocaleDateString()}`) + '.' +
          (skipped > 0 ? `\n${skipped} invalid entries will be skipped.` : '') +
          `\n\n⚠️ WARNING: This will REPLACE all current data in your collection.\n\n` +
          `Do you want to proceed?`
        );

        if (!confirmed) {
          resolve(false);
          return;
        }

        // Atomic replace: if bulkAdd fails, the clear() is rolled back too.
        await db.transaction('rw', db.vinyls, async () => {
          await db.vinyls.clear();
          await db.vinyls.bulkAdd(recordsToAdd);
        });

        alert(`Restore complete! ${recordsToAdd.length} records have been imported.` +
          (skipped > 0 ? ` ${skipped} invalid entries were skipped.` : ''));
        resolve(true);

      } catch (error) {
        console.error('Backup restore failed:', error);
        alert('Failed to restore backup. The file may be corrupted or in an invalid format.');
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error('File read error:', error);
      reject(error);
    };

    reader.readAsText(file);
  });
};
