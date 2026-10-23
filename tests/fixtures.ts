import { VinylRecord, WishlistItem } from '../types';

/** A complete, valid wishlist item; override any field per test. */
export const makeWishlistItem = (overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  artist: 'John Coltrane',
  album: 'Blue Train',
  label: 'Blue Note',
  catNumber: 'BLP 1577',
  releaseYear: 1958,
  discogsLink: 'https://www.discogs.com/master/2',
  notes: 'Mono pressing',
  priority: 'high',
  maxPrice: 40,
  addedAt: new Date('2025-02-01T00:00:00Z'),
  ...overrides,
});

/** A complete, valid record; override any field per test. */
export const makeRecord = (overrides: Partial<VinylRecord> = {}): VinylRecord => ({
  artist: 'Miles Davis',
  album: 'Kind of Blue',
  genre: ['Jazz'],
  collection: 'Main',
  releaseYear: 1959,
  country: 'US',
  label: ['Columbia'],
  catNumber: ['CS 8163'],
  conditionSleeve: 'VG+',
  conditionMedia: 'NM',
  soundQuality: 5,
  rating: 10,
  bestTracks: ['So What'],
  comments: '',
  discogsLink: 'https://www.discogs.com/release/1',
  toBeSold: false,
  addedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});
