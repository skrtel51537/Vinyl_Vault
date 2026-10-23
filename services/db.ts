import Dexie, { Table } from 'dexie';
import { VinylRecord, WishlistItem } from '../types';
import { notify } from './notify';

class VinylDatabase extends Dexie {
  vinyls!: Table<VinylRecord>;
  wishlist!: Table<WishlistItem>;

  constructor() {
    super('VinylVaultDB');
    (this as any).version(1).stores({
      vinyls: '++id, artist, album, *genre, releaseYear, rating, toBeSold, addedAt'
    });
    // v2 (app 1.4.0): the dominant color is now picked from the most vivid hue
    // instead of the average. Drop the stored colors once so cards recompute them.
    this.version(2).stores({
      vinyls: '++id, artist, album, *genre, releaseYear, rating, toBeSold, addedAt'
    }).upgrade(tx => tx.table('vinyls').toCollection().modify((record: VinylRecord) => {
      delete record.dominantColor;
    }));
    // v3 (app 1.5.0): the wishlist gets its own table, so it never mixes with the
    // collection or its statistics. Existing records are untouched.
    this.version(3).stores({
      vinyls: '++id, artist, album, *genre, releaseYear, rating, toBeSold, addedAt',
      wishlist: '++id, artist, album, priority, addedAt',
    });
  }
}

export const db = new VinylDatabase();

/**
 * Ask the browser to keep this origin's storage (IndexedDB) as "persistent", so the
 * collection is not evicted under storage pressure. The browser may grant it silently
 * (Chrome/Edge, based on engagement) or ask the user (Firefox). Safe to call repeatedly.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};

export const deleteVinylById = async (id: number): Promise<void> => {
  console.log(`[DB] Deleting ID: ${id} (type: ${typeof id})`);
  // Direct delete. Dexie promises are reliable. 
  // If the key doesn't exist, it succeeds silently, which is fine.
  // This removes any read-before-write logic that could cause race conditions.
  await db.vinyls.delete(id);
};

/**
 * "Got it!": add a wishlist record to the collection and remove it from the wishlist
 * in a single transaction, so it is never lost nor in both places.
 */
export const moveWishlistItemToCollection = async (itemId: number, record: VinylRecord): Promise<number> =>
  db.transaction('rw', db.vinyls, db.wishlist, async () => {
    const id = await db.vinyls.add(record);
    await db.wishlist.delete(itemId);
    return id as number;
  });

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
    notify('Error clearing the database. Check the console for details.', 'error');
    return false;
  }
};