import { describe, expect, it } from 'vitest';
import {
  conditionFromDiscogs, discogsReleaseId, DiscogsFileError, isVinylFormat, parseDiscogsCollection,
  parseDiscogsWantlist, splitNewAndExisting, stripDiscogsSuffix,
} from '../services/discogsCsv';
import { makeRecord } from './fixtures';

// Invented rows shaped like real Discogs exports (never real user data).
const COLLECTION_HEADERS = ['Catalog#', 'Artist', 'Title', 'Label', 'Format', 'Rating', 'Released', 'release_id',
  'CollectionFolder', 'Date Added', 'Collection Media Condition', 'Collection Sleeve Condition', 'Collection Notes'];
const WANTLIST_HEADERS = ['Catalog#', 'Artist', 'Title', 'Label', 'Format', 'Rating', 'Released', 'release_id', 'Notes'];

const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
const csv = (headers: string[], rows: Record<string, string>[]) =>
  [headers.join(','), ...rows.map(r => headers.map(h => quote(r[h] ?? '')).join(','))].join('\n');

const collectionRow = (overrides: Record<string, string> = {}) => ({
  'Catalog#': 'SHVL 815', 'Artist': 'Pink Floyd', 'Title': 'Animals', 'Label': 'Harvest', 'Format': 'LP, Album',
  'Rating': '', 'Released': '1977', 'release_id': '1001', 'CollectionFolder': 'Used',
  'Date Added': '2024-05-14 18:22:11', 'Collection Media Condition': 'Very Good Plus (VG+)',
  'Collection Sleeve Condition': 'Very Good (VG)', 'Collection Notes': '', ...overrides,
});

describe('parseDiscogsCollection', () => {
  it('maps a Discogs row to a record', async () => {
    const { items: [r] } = await parseDiscogsCollection(csv(COLLECTION_HEADERS, [collectionRow({
      'Catalog#': '0602537, PIASC1075LP , none', 'Artist': 'Coven (3)', 'Title': 'Déjà Vu',
      'Label': 'Akarma, Akarma, Mediterraneo (3)', 'Rating': '4', 'Collection Notes': 'Gatefold',
    })]));

    expect(r).toMatchObject({
      artist: 'Coven', album: 'Déjà Vu', genre: [], collection: 'Used', releaseYear: 1977, country: '-',
      label: ['Akarma', 'Mediterraneo'], catNumber: ['0602537', 'PIASC1075LP'], conditionMedia: 'VG+',
      conditionSleeve: 'VG', soundQuality: 0, rating: 8, bestTracks: [], comments: 'Gatefold',
      discogsLink: 'https://www.discogs.com/release/1001', toBeSold: false,
    });
    expect(r.addedAt).toEqual(new Date(2024, 4, 14, 18, 22, 11));
  });

  it('handles unknown years, missing ratings and conditions, and the default folder', async () => {
    const { items: [r] } = await parseDiscogsCollection(csv(COLLECTION_HEADERS, [collectionRow({
      'Released': '0', 'Rating': '', 'CollectionFolder': 'Uncategorized', 'Collection Media Condition': '',
      'Collection Sleeve Condition': 'Generic', 'Date Added': '',
    })]));
    expect(r).toMatchObject({ releaseYear: null, rating: 0, collection: 'Main', conditionMedia: '', conditionSleeve: 'Generic' });
    expect(r.addedAt).toBeInstanceOf(Date);
  });

  it('keeps artist names with commas whole', async () => {
    const { items: [r] } = await parseDiscogsCollection(csv(COLLECTION_HEADERS, [collectionRow({ 'Artist': 'Crosby, Stills, Nash & Young' })]));
    expect(r.artist).toBe('Crosby, Stills, Nash & Young');
  });

  it('adds custom collection fields to the comments', async () => {
    const headers = [...COLLECTION_HEADERS, 'Collection Price'];
    const { items: [r] } = await parseDiscogsCollection(csv(headers, [collectionRow({ 'Collection Notes': 'Signed', 'Collection Price': '25 €' })]));
    expect(r.comments).toBe('Signed\nPrice: 25 €');
  });

  it('skips formats that are not vinyl and rows without artist and title', async () => {
    const result = await parseDiscogsCollection(csv(COLLECTION_HEADERS, [
      collectionRow({ 'Title': 'Vinyl', 'Format': '2xLP, Album, RE, 180 + CD, Album, RE' }),
      collectionRow({ 'Title': 'Disc', 'Format': 'CD, Album' }),
      collectionRow({ 'Title': 'Tape', 'Format': 'Cass, Album' }),
      collectionRow({ 'Artist': '', 'Title': '' }),
    ]));
    expect(result.items.map(r => r.album)).toEqual(['Vinyl']);
    expect(result).toMatchObject({ skippedNotVinyl: 2, invalid: 1 });
  });

  it('accepts a file that starts with a BOM', async () => {
    const { items } = await parseDiscogsCollection('﻿' + csv(COLLECTION_HEADERS, [collectionRow()]));
    expect(items).toHaveLength(1);
  });

  it('rejects a wantlist or any other file with a clear message', async () => {
    await expect(parseDiscogsCollection(csv(WANTLIST_HEADERS, []))).rejects.toThrow(/wantlist export/);
    await expect(parseDiscogsCollection('Artist,Album\nA,B')).rejects.toThrow(DiscogsFileError);
    await expect(parseDiscogsCollection('')).rejects.toThrow(/not a Discogs CSV export/);
  });
});

describe('parseDiscogsWantlist', () => {
  it('maps a wantlist row to a wishlist item, ignoring stray empty columns', async () => {
    const text = csv(WANTLIST_HEADERS, [{
      'Catalog#': 'FDR 633, B0025910-01', 'Artist': 'Point Blank (9)', 'Title': 'Second Season',
      'Label': 'Future Days Recordings, Universal Music, Future Days Recordings, Universal Music',
      'Format': 'LP, Album, RE', 'Released': '2015', 'release_id': '2002', 'Notes': 'Red vinyl',
    }]).replace(/\n(.*)$/, '\n$1,');
    const { items: [w] } = await parseDiscogsWantlist(text);
    expect(w).toMatchObject({
      artist: 'Point Blank', album: 'Second Season', label: 'Future Days Recordings, Universal Music',
      catNumber: 'FDR 633, B0025910-01', releaseYear: 2015, discogsLink: 'https://www.discogs.com/release/2002',
      notes: 'Red vinyl', priority: 'medium', maxPrice: null,
    });
  });

  it('rejects a collection export', async () => {
    await expect(parseDiscogsWantlist(csv(COLLECTION_HEADERS, [collectionRow()]))).rejects.toThrow(/collection export/);
  });
});

describe('helpers', () => {
  it('tells vinyl formats apart', () => {
    expect(['LP, Album', '2x12"', '7", Single, 45 RPM', '3xLP, Comp + Box', 'Flexi-disc', '', 'Box, Comp'].map(isVinylFormat))
      .toEqual([true, true, true, true, true, true, true]);
    expect(['CD, Album', 'Cass', 'File, MP3', '2xCD + DVD'].map(isVinylFormat)).toEqual([false, false, false, false]);
  });

  it('maps conditions and strips suffixes', () => {
    expect(conditionFromDiscogs('Near Mint (NM or M-)')).toBe('NM');
    expect(conditionFromDiscogs('Not Graded')).toBe('Not Graded');
    expect(stripDiscogsSuffix('Johnny Blue Skies & The Dark Clouds (2)')).toBe('Johnny Blue Skies & The Dark Clouds');
  });

  it('reads the release id of Discogs release links only', () => {
    expect(discogsReleaseId('https://www.discogs.com/release/123-Pink-Floyd-Animals')).toBe('123');
    expect(discogsReleaseId('https://www.discogs.com/es/release/456')).toBe('456');
    expect(discogsReleaseId('https://www.discogs.com/master/789')).toBeNull();
    expect(discogsReleaseId('')).toBeNull();
  });
});

describe('splitNewAndExisting', () => {
  const link = (id: number) => `https://www.discogs.com/release/${id}`;

  it('matches by release, or by artist and album when a release link is missing', () => {
    const saved = [
      makeRecord({ artist: 'Pink Floyd', album: 'Animals', discogsLink: link(1) }),
      makeRecord({ artist: 'Coven', album: 'Witchcraft', discogsLink: '' }),
      makeRecord({ artist: 'Cream', album: 'Wheels of Fire', discogsLink: link(5) }),
    ];
    const incoming = [
      makeRecord({ artist: 'Pink Floyd', album: 'Animals (Remastered)', discogsLink: link(1) }), // same release
      makeRecord({ artist: 'Coven (3)', album: 'WITCHCRAFT', discogsLink: link(2) }), // saved without link
      makeRecord({ artist: 'Cream', album: 'Wheels of Fire', discogsLink: link(6) }), // another pressing
      makeRecord({ artist: 'Cream', album: 'Wheels of Fire', discogsLink: '' }), // no link, same title
      makeRecord({ artist: 'Kyuss', album: 'Blues for the Red Sun', discogsLink: link(3) }),
      makeRecord({ artist: 'Kyuss', album: 'Blues for the Red Sun', discogsLink: link(3) }), // second copy
    ];
    const { fresh, existing } = splitNewAndExisting(incoming, saved);
    expect(existing.map(r => r.discogsLink)).toEqual([link(1), link(2), '']);
    expect(fresh.map(r => r.discogsLink)).toEqual([link(6), link(3), link(3)]);
  });
});
