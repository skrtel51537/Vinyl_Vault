import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { db } from '../services/db';
import { makeRecord } from './fixtures';

describe('database upgrades', () => {
  it('v1 → v3 keeps every record, drops the old dominant colors and adds an empty wishlist', async () => {
    // Simulate a database created by app 1.3.x (schema version 1).
    const legacy = new Dexie('VinylVaultDB');
    legacy.version(1).stores({ vinyls: '++id, artist, album, *genre, releaseYear, rating, toBeSold, addedAt' });
    await legacy.table('vinyls').bulkAdd([
      makeRecord({ album: 'A', coverUrl: 'data:image/png;base64,AA', dominantColor: 'rgb(90, 80, 70)' }),
      makeRecord({ album: 'B' }),
    ]);
    legacy.close();

    const records = await db.vinyls.orderBy('album').toArray();

    expect(db.verno).toBe(3);
    expect(records.map(r => r.album)).toEqual(['A', 'B']);
    expect(records[0].coverUrl).toBe('data:image/png;base64,AA');
    expect(records.some(r => 'dominantColor' in r)).toBe(false);
    expect(await db.wishlist.count()).toBe(0);
  });

  it('removes a field when updated with undefined (used when a cover changes)', async () => {
    const id = await db.vinyls.add(makeRecord({ dominantColor: 'rgb(1, 2, 3)' }));
    await db.vinyls.update(id, { dominantColor: undefined });
    expect(await db.vinyls.get(id)).not.toHaveProperty('dominantColor');
  });
});
