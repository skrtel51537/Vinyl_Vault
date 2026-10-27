import { db } from './db';
import { VinylRecord, WishlistItem } from '../types';
import { exportCollectionToExcel } from './excelService';
import { confirmDialog, notify } from './notify';
import { recordBackupDone } from './backupReminder';
import { normalizePriority, parsePrice } from './wishlist';

/**
 * Backup file format interface
 */
interface VinylVaultBackup {
  version: string;
  exportDate: string;
  recordCount: number;
  records: VinylRecord[];
  wishlist?: WishlistItem[]; // Since backup format 1.2.0 (app 1.5.0)
}

/**
 * Export a complete backup of the database.
 * Downloads both an Excel file (metadata only) and a JSON file (full data with images).
 */
export const exportFullBackup = async (): Promise<void> => {
  const [records, wishlist] = await Promise.all([db.vinyls.toArray(), db.wishlist.toArray()]);

  if (records.length === 0 && wishlist.length === 0) {
    notify('No records to back up.', 'info');
    return;
  }

  // 1. Export Excel (collection sheet + wishlist sheet)
  await exportCollectionToExcel(records, wishlist);

  // 2. Export JSON with full data including coverUrl (Base64 images)
  const backup: VinylVaultBackup = {
    version: '1.2.0',
    exportDate: new Date().toISOString(),
    recordCount: records.length,
    // Moods were removed in 1.6.0; records saved before then may still carry them.
    records: records.map(({ moods: _moods, ...record }: VinylRecord & { moods?: unknown }) => record),
    wishlist: wishlist,
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
  recordBackupDone();

  notify(`Backup complete: ${records.length} records` +
    (wishlist.length > 0 ? ` and ${wishlist.length} wishlist item${wishlist.length === 1 ? '' : 's'}` : '') +
    ` exported.\nDownloaded an Excel file (metadata) and a JSON file (full backup with covers).`, 'success');
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

const toYear = (v: unknown): number | null => {
  const year = v === null || v === undefined ? NaN : Number(v);
  return Number.isInteger(year) && year > 0 ? year : null;
};

const toDate = (v: unknown): Date => {
  const date = new Date(toStr(v));
  return isNaN(date.getTime()) ? new Date() : date;
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

  const coverUrl = toStr(r.coverUrl);
  const dominantColor = toStr(r.dominantColor);

  return {
    artist: artist || 'Unknown Artist',
    album: album || 'Unknown Album',
    genre: toStrArray(r.genre),
    collection: toStr(r.collection),
    releaseYear: toYear(r.releaseYear),
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
    addedAt: toDate(r.addedAt),
  };
};

/**
 * Coerce an untrusted backup wishlist entry into a well-formed WishlistItem.
 * Returns null for entries that are not objects or lack both artist and album.
 */
export const normalizeWishlistItem = (raw: unknown): WishlistItem | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const artist = toStr(r.artist).trim();
  const album = toStr(r.album).trim();
  if (!artist && !album) return null;

  return {
    artist: artist || 'Unknown Artist',
    album: album || 'Unknown Album',
    label: toStr(r.label),
    catNumber: toStr(r.catNumber),
    releaseYear: toYear(r.releaseYear),
    discogsLink: toStr(r.discogsLink),
    notes: toStr(r.notes),
    priority: normalizePriority(r.priority),
    maxPrice: parsePrice(r.maxPrice),
    addedAt: toDate(r.addedAt),
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
          notify('Invalid backup file format. Please select a valid Vinyl Vault backup.', 'error');
          resolve(false);
          return;
        }

        // Normalize every entry (ids are dropped so Dexie auto-generates new ones)
        const recordsToAdd = backup.records
          .map(normalizeRecord)
          .filter((r): r is VinylRecord => r !== null);
        // Backups made before 1.5.0 have no wishlist: the current one is then kept.
        const rawWishlist = Array.isArray(backup.wishlist) ? backup.wishlist : null;
        const wishlistToAdd = rawWishlist
          ?.map(normalizeWishlistItem)
          .filter((w): w is WishlistItem => w !== null) ?? null;
        const skipped = backup.records.length - recordsToAdd.length +
          (rawWishlist && wishlistToAdd ? rawWishlist.length - wishlistToAdd.length : 0);

        if (recordsToAdd.length === 0 && !wishlistToAdd?.length) {
          notify('This backup contains no valid records. Your collection was not changed.', 'error');
          resolve(false);
          return;
        }

        const exportDate = new Date(backup.exportDate);
        const wishlistNote = wishlistToAdd
          ? ` and ${wishlistToAdd.length} wishlist item${wishlistToAdd.length === 1 ? '' : 's'}`
          : '';
        const confirmed = await confirmDialog(
          `This backup contains ${recordsToAdd.length} valid records${wishlistNote}` +
          (isNaN(exportDate.getTime()) ? '' : ` from ${exportDate.toLocaleDateString()}`) + '.' +
          (skipped > 0 ? `\n${skipped} invalid entries will be skipped.` : '') +
          `\n\nThis will REPLACE all current data in your collection${wishlistToAdd ? ' and wishlist' : ''}.` +
          (wishlistToAdd ? '' : '\nThis backup has no wishlist: your current wishlist will be kept.'),
          { title: 'Restore backup?', confirmLabel: 'Replace collection', danger: true }
        );

        if (!confirmed) {
          resolve(false);
          return;
        }

        // Atomic replace: if any bulkAdd fails, the clear() calls are rolled back too.
        await db.transaction('rw', db.vinyls, db.wishlist, async () => {
          await db.vinyls.clear();
          await db.vinyls.bulkAdd(recordsToAdd);
          if (wishlistToAdd) {
            await db.wishlist.clear();
            await db.wishlist.bulkAdd(wishlistToAdd);
          }
        });

        notify(`Restore complete: ${recordsToAdd.length} records${wishlistNote} imported.` +
          (skipped > 0 ? ` ${skipped} invalid entries were skipped.` : ''), 'success');
        resolve(true);

      } catch (error) {
        console.error('Backup restore failed:', error);
        notify('Failed to restore backup. The file may be corrupted or in an invalid format. Your collection was not changed.', 'error');
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
