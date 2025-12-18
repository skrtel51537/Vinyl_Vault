import Dexie, { Table } from 'dexie';
import { VinylRecord } from '../types';

class VinylDatabase extends Dexie {
  vinyls!: Table<VinylRecord>;

  constructor() {
    super('VinylVaultDB');
    (this as any).version(1).stores({
      vinyls: '++id, artist, album, *genre, releaseYear, rating, toBeSold, addedAt'
    });
  }
}

export const db = new VinylDatabase();

export const deleteVinylById = async (id: number): Promise<void> => {
  console.log(`[DB] Deleting ID: ${id} (type: ${typeof id})`);
  // Direct delete. Dexie promises are reliable. 
  // If the key doesn't exist, it succeeds silently, which is fine.
  // This removes any read-before-write logic that could cause race conditions.
  await db.vinyls.delete(id);
};

export const resetDatabase = async (): Promise<boolean> => {
  try {
    await db.vinyls.clear();
    
    // Double check that it is empty
    const count = await db.vinyls.count();
    if (count > 0) {
        console.error("Database clear failed, records remain:", count);
        return false;
    }
    
    console.log("Database cleared successfully");
    return true;
  } catch (err) {
    console.error("Could not clear database", err);
    alert("Error clearing database. Check console for details.");
    return false;
  }
};