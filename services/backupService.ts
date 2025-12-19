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

/**
 * Import a complete backup from a JSON file.
 * This will REPLACE all existing data.
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

        // Confirm before replacing
        const confirmed = window.confirm(
          `This backup contains ${backup.recordCount} records from ${new Date(backup.exportDate).toLocaleDateString()}.\n\n` +
          `⚠️ WARNING: This will REPLACE all current data in your collection.\n\n` +
          `Do you want to proceed?`
        );

        if (!confirmed) {
          resolve(false);
          return;
        }

        // Clear existing data
        await db.vinyls.clear();

        // Restore records - need to remove 'id' so Dexie auto-generates new ones
        const recordsToAdd = backup.records.map(r => {
          const { id, ...rest } = r;
          // Ensure addedAt is a Date object
          return {
            ...rest,
            addedAt: new Date(rest.addedAt),
          };
        });

        await db.vinyls.bulkAdd(recordsToAdd as VinylRecord[]);

        alert(`Restore complete! ${recordsToAdd.length} records have been imported.`);
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
