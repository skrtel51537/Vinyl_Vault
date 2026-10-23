import { describe, expect, it } from 'vitest';
import { filterAndSortVinyls } from '../services/collectionFilter';
import { FilterState } from '../types';
import { makeRecord } from './fixtures';

const noFilters: FilterState = {
  search: '', genre: null, artist: null, collection: null, releaseYear: null,
  conditionSleeve: null, conditionMedia: null, toBeSold: null,
};

const records = [
  makeRecord({ id: 1, artist: 'Miles Davis', album: 'Kind of Blue', genre: ['Jazz'], releaseYear: 1959, rating: 10, soundQuality: 5, addedAt: new Date('2025-01-01') }),
  makeRecord({ id: 2, artist: 'Daft Punk', album: 'Discovery', genre: ['Electronic', 'House'], label: ['Virgin'], releaseYear: 2001, rating: 0, soundQuality: 3, toBeSold: true, addedAt: new Date('2025-03-01') }),
  makeRecord({ id: 3, artist: 'Björk', album: 'Homogenic', genre: ['Electronic'], releaseYear: null, rating: 7, soundQuality: 0, bestTracks: ['Jóga'], collection: 'Box', addedAt: new Date('2025-02-01') }),
];
const ids = (list: { id?: number }[]) => list.map(r => r.id);

describe('filterAndSortVinyls', () => {
  it('returns everything, newest first, with no filters', () => {
    expect(ids(filterAndSortVinyls(records, noFilters, 'added_desc'))).toEqual([2, 3, 1]);
  });

  it('does not modify the input array', () => {
    const copy = [...records];
    filterAndSortVinyls(records, noFilters, 'artist_asc');
    expect(records).toEqual(copy);
  });

  it('searches album, artist, label, genre, year and best tracks, case-insensitively', () => {
    const search = (q: string) => ids(filterAndSortVinyls(records, { ...noFilters, search: q }, 'added_desc'));
    expect(search('KIND')).toEqual([1]);
    expect(search('daft')).toEqual([2]);
    expect(search('virgin')).toEqual([2]);
    expect(search('house')).toEqual([2]);
    expect(search('1959')).toEqual([1]);
    expect(search('jóga')).toEqual([3]);
    expect(search('nothing matches')).toEqual([]);
  });

  it('applies exact-match filters together', () => {
    expect(ids(filterAndSortVinyls(records, { ...noFilters, genre: 'Electronic' }, 'added_desc'))).toEqual([2, 3]);
    expect(ids(filterAndSortVinyls(records, { ...noFilters, genre: 'Electronic', collection: 'Box' }, 'added_desc'))).toEqual([3]);
    expect(ids(filterAndSortVinyls(records, { ...noFilters, artist: 'Miles Davis' }, 'added_desc'))).toEqual([1]);
    expect(ids(filterAndSortVinyls(records, { ...noFilters, releaseYear: 2001 }, 'added_desc'))).toEqual([2]);
    expect(ids(filterAndSortVinyls(records, { ...noFilters, toBeSold: true }, 'added_desc'))).toEqual([2]);
    expect(ids(filterAndSortVinyls(records, { ...noFilters, toBeSold: false }, 'added_desc'))).toEqual([3, 1]);
  });

  it('sorts by artist and year (records without a year go last when ascending)', () => {
    expect(ids(filterAndSortVinyls(records, noFilters, 'artist_asc'))).toEqual([3, 2, 1]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'artist_desc'))).toEqual([1, 2, 3]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'year_asc'))).toEqual([1, 2, 3]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'year_desc'))).toEqual([2, 1, 3]);
  });

  it('hides unrated records when sorting by rating or sound quality', () => {
    expect(ids(filterAndSortVinyls(records, noFilters, 'rating_desc'))).toEqual([1, 3]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'rating_asc'))).toEqual([3, 1]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'sound_desc'))).toEqual([1, 2]);
    expect(ids(filterAndSortVinyls(records, noFilters, 'sound_asc'))).toEqual([2, 1]);
  });
});
