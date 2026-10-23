import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, moveWishlistItemToCollection } from '../services/db';
import { normalizePriority, parsePrice, sortWishlist, wishlistToRecord } from '../services/wishlist';
import { makeRecord, makeWishlistItem } from './fixtures';

beforeEach(async () => {
  await db.vinyls.clear();
  await db.wishlist.clear();
});
afterEach(() => { vi.restoreAllMocks(); });

describe('normalizePriority', () => {
  it('accepts known priorities in any case and defaults to medium', () => {
    expect(normalizePriority('HIGH')).toBe('high');
    expect(normalizePriority(' low ')).toBe('low');
    expect(normalizePriority('urgent')).toBe('medium');
    expect(normalizePriority(undefined)).toBe('medium');
  });
});

describe('parsePrice', () => {
  it('reads numbers and text with a decimal comma or point', () => {
    expect(parsePrice(25)).toBe(25);
    expect(parsePrice('19,99')).toBe(19.99);
    expect(parsePrice(' 7.5 ')).toBe(7.5);
    expect(parsePrice('12.346')).toBe(12.35);
  });

  it('treats empty, negative or invalid values as "no limit"', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice(-5)).toBeNull();
    expect(parsePrice('cheap')).toBeNull();
  });
});

describe('sortWishlist', () => {
  it('orders by priority, then newest first, without changing the input', () => {
    const items = [
      makeWishlistItem({ album: 'Low', priority: 'low' }),
      makeWishlistItem({ album: 'High old', priority: 'high', addedAt: new Date('2025-01-01') }),
      makeWishlistItem({ album: 'Medium', priority: 'medium' }),
      makeWishlistItem({ album: 'High new', priority: 'high', addedAt: new Date('2025-06-01') }),
    ];
    expect(sortWishlist(items).map(i => i.album)).toEqual(['High new', 'High old', 'Medium', 'Low']);
    expect(items[0].album).toBe('Low');
  });
});

describe('wishlistToRecord', () => {
  it('pre-fills the collection fields it knows', () => {
    expect(wishlistToRecord(makeWishlistItem())).toEqual({
      artist: 'John Coltrane', album: 'Blue Train', label: ['Blue Note'], catNumber: ['BLP 1577'],
      releaseYear: 1958, discogsLink: 'https://www.discogs.com/master/2', comments: 'Mono pressing',
    });
    expect(wishlistToRecord(makeWishlistItem({ label: '', catNumber: '' }))).toMatchObject({ label: [], catNumber: [] });
  });
});

describe('moveWishlistItemToCollection', () => {
  it('adds the record and removes the wishlist item', async () => {
    const itemId = await db.wishlist.add(makeWishlistItem());
    await moveWishlistItemToCollection(itemId as number, makeRecord({ album: 'Blue Train' }));

    expect((await db.vinyls.toArray()).map(r => r.album)).toEqual(['Blue Train']);
    expect(await db.wishlist.count()).toBe(0);
  });

  it('is atomic: if adding fails, the item stays on the wishlist', async () => {
    const itemId = await db.wishlist.add(makeWishlistItem());
    vi.spyOn(db.vinyls, 'add').mockRejectedValueOnce(new Error('disk full'));

    await expect(moveWishlistItemToCollection(itemId as number, makeRecord())).rejects.toThrow('disk full');
    expect(await db.wishlist.count()).toBe(1);
    expect(await db.vinyls.count()).toBe(0);
  });
});
