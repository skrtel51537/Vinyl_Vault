import { VinylRecord, WishlistItem } from '../types';

// Like excelService: SheetJS is loaded on demand, only when a file is imported.
const loadXlsx = () => import('xlsx');

export type DiscogsKind = 'collection' | 'wantlist';

/** The chosen file is not the expected Discogs export. The message is meant for the user. */
export class DiscogsFileError extends Error {}

export interface DiscogsParseResult<T> {
  items: T[];
  skippedNotVinyl: number; // CDs, cassettes, files…
  invalid: number; // Rows without artist and title
}

// Condition grades as Discogs writes them, next to the codes the app uses.
export const DISCOGS_CONDITIONS: [code: string, discogs: string][] = [
  ['M', 'Mint (M)'],
  ['NM', 'Near Mint (NM or M-)'],
  ['VG+', 'Very Good Plus (VG+)'],
  ['VG', 'Very Good (VG)'],
  ['G+', 'Good Plus (G+)'],
  ['G', 'Good (G)'],
  ['F', 'Fair (F)'],
  ['P', 'Poor (P)'],
];
const CODE_BY_DISCOGS = new Map(DISCOGS_CONDITIONS.map(([code, discogs]) => [discogs.toLowerCase(), code]));

/** "Very Good Plus (VG+)" → "VG+". Other values (Generic, No Cover, Not Graded…) are kept as they are. */
export const conditionFromDiscogs = (value: string): string => {
  const text = value.trim();
  return CODE_BY_DISCOGS.get(text.toLowerCase()) ?? text;
};

/** Discogs adds " (2)", " (3)"… to tell apart artists or labels with the same name. */
export const stripDiscogsSuffix = (name: string): string => name.replace(/ \(\d+\)/g, '').trim();

// Discogs joins several labels or catalog numbers with ", ". Artist names are never
// split: some contain commas ("Crosby, Stills, Nash & Young").
const splitValues = (text: string): string[] => text.split(', ').map(s => s.trim()).filter(Boolean);
const unique = (values: string[]): string[] => [...new Set(values)];

const VINYL_FORMATS = new Set(['lp', 'vinyl', 'flexi-disc', 'lathe cut', 'acetate', 'shellac']);
const OTHER_FORMATS = new Set(['cd', 'cdr', 'cdv', 'sacd', 'hdcd', 'cass', 'file', 'dvd', 'dvdr', 'blu-ray', 'minidisc', 'vhs', '8-trk', 'dat']);

/**
 * Whether a Discogs format ("2xLP, Album, RE", '7", Single', "CD, Album") includes vinyl.
 * Only formats that are clearly something else are rejected; unknown or empty ones are kept.
 */
export const isVinylFormat = (format: string): boolean => {
  const parts = format.split(/[,+]/).map(p => p.trim().replace(/^\d+x/i, '').toLowerCase()).filter(Boolean);
  if (parts.some(p => VINYL_FORMATS.has(p) || /^\d+"$/.test(p))) return true;
  return !parts.some(p => OTHER_FORMATS.has(p));
};

/** "1973" (or "1973-03-01") → 1973. Discogs writes "0" when the year is unknown. */
const parseYear = (text: string): number | null => {
  const year = parseInt(text.slice(0, 4), 10);
  return year > 0 ? year : null;
};

/** Discogs rates 1–5 stars, the app out of 10. Empty means not rated (0). */
const parseRating = (text: string): number => {
  const stars = parseInt(text, 10);
  return stars >= 1 && stars <= 5 ? stars * 2 : 0;
};

/** "2026-08-08 07:58:58" → that date (local time); today when missing or invalid. */
const parseDateAdded = (text: string): Date => {
  const date = new Date(text.replace(' ', 'T'));
  return isNaN(date.getTime()) ? new Date() : date;
};

export const discogsReleaseUrl = (releaseId: string): string =>
  /^\d+$/.test(releaseId) ? `https://www.discogs.com/release/${releaseId}` : '';

/** Release id in a Discogs release link ("…discogs.com/es/release/123-Artist-Title" → "123"); null otherwise. */
export const discogsReleaseId = (link: string): string | null =>
  link.match(/discogs\.com\/(?:[^/?#]+\/)*release\/(\d+)/i)?.[1] ?? null;

type Row = Record<string, unknown>;
type Getter = (column: string) => string;

const REQUIRED_COLUMNS = ['Catalog#', 'Artist', 'Title', 'Label', 'Format', 'release_id'];
// Collection columns Discogs always exports. Any other "Collection …" column is a custom field.
const COLLECTION_COLUMNS = ['Collection Media Condition', 'Collection Sleeve Condition', 'Collection Notes'];

const NOT_DISCOGS = 'This file is not a Discogs CSV export. Export it from Discogs (Collection or Wantlist → Export) ' +
  'and choose the .csv file without opening it in Excel first.';
const WRONG_FILE: Record<DiscogsKind, string> = {
  collection: 'This is a Discogs collection export. Use "Discogs collection" to import it.',
  wantlist: 'This is a Discogs wantlist export. Use "Discogs wantlist" to import it.',
};

/** Reads the CSV text (already decoded as UTF-8) and tells which Discogs export it is. */
const readDiscogsCsv = async (text: string, expected: DiscogsKind): Promise<Row[]> => {
  const XLSX = await loadXlsx();
  // raw: every value stays text, so catalog numbers keep leading zeros and never turn into dates.
  const workbook = XLSX.read(text.replace(/^﻿/, ''), { type: 'string', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const headers = (XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[0] ?? []).map(h => String(h).trim());
  if (!REQUIRED_COLUMNS.every(c => headers.includes(c))) throw new DiscogsFileError(NOT_DISCOGS);
  const kind: DiscogsKind = headers.includes('CollectionFolder') ? 'collection' : 'wantlist';
  if (kind !== expected) throw new DiscogsFileError(WRONG_FILE[kind]);
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
};

const convertRows = <T>(rows: Row[], convert: (get: Getter, row: Row) => T): DiscogsParseResult<T> => {
  const result: DiscogsParseResult<T> = { items: [], skippedNotVinyl: 0, invalid: 0 };
  rows.forEach(row => {
    const get: Getter = column => String(row[column] ?? '').trim();
    if (!get('Artist') && !get('Title')) result.invalid++;
    else if (!isVinylFormat(get('Format'))) result.skippedNotVinyl++;
    else result.items.push(convert(get, row));
  });
  return result;
};

// Labels and catalog numbers come in two separate lists that Discogs does not keep paired
// (labels repeat, catalog numbers are grouped), so they are stored as two lists.
const labelsOf = (get: Getter): string[] => unique(splitValues(get('Label')).map(stripDiscogsSuffix).filter(Boolean));
const catalogNumbersOf = (get: Getter): string[] => unique(splitValues(get('Catalog#')).filter(c => c.toLowerCase() !== 'none'));

const rowToRecord = (get: Getter, row: Row): VinylRecord => {
  // Custom collection fields ("Collection Price"…) go to the comments as "Price: value".
  const customFields = Object.keys(row)
    .filter(c => c.startsWith('Collection ') && !COLLECTION_COLUMNS.includes(c) && get(c))
    .map(c => `${c.slice('Collection '.length)}: ${get(c)}`);
  const folder = get('CollectionFolder');

  return {
    artist: stripDiscogsSuffix(get('Artist')) || 'Unknown Artist',
    album: get('Title') || 'Unknown Album',
    genre: [], // Not in the Discogs export: added by hand
    collection: !folder || folder === 'Uncategorized' ? 'Main' : folder,
    releaseYear: parseYear(get('Released')),
    country: '-',
    label: labelsOf(get),
    catNumber: catalogNumbersOf(get),
    conditionSleeve: conditionFromDiscogs(get('Collection Sleeve Condition')),
    conditionMedia: conditionFromDiscogs(get('Collection Media Condition')),
    soundQuality: 0,
    rating: parseRating(get('Rating')),
    bestTracks: [],
    comments: [get('Collection Notes'), ...customFields].filter(Boolean).join('\n'),
    discogsLink: discogsReleaseUrl(get('release_id')),
    toBeSold: false,
    addedAt: parseDateAdded(get('Date Added')),
  };
};

const rowToWishlistItem = (get: Getter): WishlistItem => ({
  artist: stripDiscogsSuffix(get('Artist')) || 'Unknown Artist',
  album: get('Title') || 'Unknown Album',
  label: labelsOf(get).join(', '),
  catNumber: catalogNumbersOf(get).join(', '),
  releaseYear: parseYear(get('Released')),
  discogsLink: discogsReleaseUrl(get('release_id')),
  notes: get('Notes'),
  priority: 'medium',
  maxPrice: null,
  addedAt: new Date(),
});

/** Records from a Discogs collection export (CSV text). Throws DiscogsFileError for any other file. */
export const parseDiscogsCollection = async (text: string): Promise<DiscogsParseResult<VinylRecord>> =>
  convertRows(await readDiscogsCsv(text, 'collection'), rowToRecord);

/** Wishlist items from a Discogs wantlist export (CSV text). Throws DiscogsFileError for any other file. */
export const parseDiscogsWantlist = async (text: string): Promise<DiscogsParseResult<WishlistItem>> =>
  convertRows(await readDiscogsCsv(text, 'wantlist'), rowToWishlistItem);

interface Comparable { artist: string; album: string; discogsLink: string }

const matchKey = (r: Comparable): string =>
  `${stripDiscogsSuffix(r.artist)}|${r.album}`.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Splits imported items into new ones and ones already saved. Two items are the same when they
 * link to the same Discogs release; when one of them has no release link, when artist and album
 * match (ignoring case and Discogs suffixes). Two pressings with different releases stay apart,
 * and copies repeated inside the file all count as new.
 */
export const splitNewAndExisting = <T extends Comparable>(incoming: T[], saved: Comparable[]): { fresh: T[]; existing: T[] } => {
  const savedIds = new Set<string>();
  const keysWithoutId = new Set<string>();
  const allKeys = new Set<string>();
  saved.forEach(s => {
    const id = discogsReleaseId(s.discogsLink);
    if (id) savedIds.add(id); else keysWithoutId.add(matchKey(s));
    allKeys.add(matchKey(s));
  });

  const fresh: T[] = [];
  const existing: T[] = [];
  incoming.forEach(item => {
    const id = discogsReleaseId(item.discogsLink);
    const known = id ? savedIds.has(id) || keysWithoutId.has(matchKey(item)) : allKeys.has(matchKey(item));
    if (known) existing.push(item); else fresh.push(item);
  });
  return { fresh, existing };
};
