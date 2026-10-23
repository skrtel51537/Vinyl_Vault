import { VinylRecord } from '../types';

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
