import { VinylRecord, WishlistItem, WishlistPriority } from '../types';

export const PRIORITIES: readonly WishlistPriority[] = ['high', 'medium', 'low'];

export const PRIORITY_LABELS: Record<WishlistPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Unknown or missing priorities fall back to "medium". */
export const normalizePriority = (value: unknown): WishlistPriority => {
  const p = String(value ?? '').trim().toLowerCase();
  return (PRIORITIES as string[]).includes(p) ? p as WishlistPriority : 'medium';
};

/**
 * Read a maximum price typed by the user or found in a backup: accepts numbers and
 * text with a decimal comma or point ("25", "19,99"). Empty, negative or invalid
 * values mean "no limit" (null). Rounded to cents.
 */
export const parsePrice = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/** Highest priority first; within a priority, the most recently added first. */
export const sortWishlist = (items: WishlistItem[]): WishlistItem[] =>
  [...items].sort((a, b) =>
    PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
    || new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

/** Collection fields pre-filled from a wishlist item when the user gets the record. */
export const wishlistToRecord = (item: WishlistItem): Partial<VinylRecord> => ({
  artist: item.artist,
  album: item.album,
  label: item.label ? [item.label] : [],
  catNumber: item.catNumber ? [item.catNumber] : [],
  releaseYear: item.releaseYear,
  discogsLink: item.discogsLink,
  comments: item.notes,
});
