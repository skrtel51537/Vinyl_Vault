import { Mood, VinylRecord } from '../types';

/**
 * Moods for "What should I play tonight?". A record's moods are the ones set by hand
 * in its details; when it has none, they are guessed from its genres and decade.
 */
export const MOODS: readonly Mood[] = ['Relax', 'Energy', 'Night', 'Party', 'Melancholy'];

/** Rating from which a record counts as a favorite in the picker. */
export const FAVORITE_RATING = 8;

/** How many recent suggestions the picker avoids repeating. */
export const RECENT_PICKS = 5;

// Genre keywords per mood, matched as lowercase substrings ("rock" also matches
// "Indie Rock"). A record can match several moods, or none (then it only comes up
// with "Surprise me").
const MOOD_KEYWORDS: Record<Mood, string[]> = {
  Relax: ['ambient', 'bossa', 'chill', 'downtempo', 'easy listening', 'folk', 'acoustic', 'lounge',
    'new age', 'reggae', 'dub', 'classical', 'smooth', 'soft rock', 'country', 'exotica'],
  Energy: ['rock', 'punk', 'metal', 'hardcore', 'garage', 'grunge', 'hip hop', 'hip-hop', 'rap',
    'drum', 'breakbeat', 'ska', 'big beat', 'industrial'],
  Night: ['jazz', 'blues', 'trip hop', 'trip-hop', 'soul', 'r&b', 'rnb', 'synth', 'darkwave',
    'noir', 'quiet storm', 'electronic', 'minimal'],
  Party: ['disco', 'funk', 'dance', 'house', 'pop', 'electro', 'techno', 'latin', 'salsa', 'boogie',
    'hi nrg', 'italo', 'new wave', 'afrobeat', 'cumbia', 'rumba', 'samba'],
  Melancholy: ['blues', 'singer-songwriter', 'singer/songwriter', 'shoegaze', 'slowcore', 'post-rock',
    'post rock', 'emo', 'goth', 'dream pop', 'sadcore', 'chanson', 'fado', 'indie', 'post-punk', 'coldwave', 'cold wave'],
};

// Decade hint: 70s and 80s pop, rock, soul and funk are party classics.
const PARTY_DECADES = [1970, 1980];
const PARTY_DECADE_KEYWORDS = ['pop', 'rock', 'soul', 'funk'];

export const decadeOf = (year: number | null): number | null =>
  year && year > 0 ? Math.floor(year / 10) * 10 : null;

/** Moods guessed from the record's genres and decade, in MOODS order. */
export const autoMoods = (record: Pick<VinylRecord, 'genre' | 'releaseYear'>): Mood[] => {
  const genres = record.genre.map(g => String(g).toLowerCase());
  const has = (keywords: string[]) => genres.some(g => keywords.some(k => g.includes(k)));
  const found = new Set<Mood>(MOODS.filter(m => has(MOOD_KEYWORDS[m])));
  const decade = decadeOf(record.releaseYear);
  if (decade !== null && PARTY_DECADES.includes(decade) && has(PARTY_DECADE_KEYWORDS)) found.add('Party');
  return MOODS.filter(m => found.has(m));
};

/** The moods that apply to a record: the manual ones if set, otherwise the guessed ones. */
export const effectiveMoods = (record: Pick<VinylRecord, 'genre' | 'releaseYear' | 'moods'>): { moods: Mood[]; auto: boolean } =>
  record.moods && record.moods.length > 0
    ? { moods: record.moods, auto: false }
    : { moods: autoMoods(record), auto: true };

/**
 * Coerce untrusted input (a backup entry, an Excel cell like "relax; Night") into a
 * list of known moods: case-insensitive, without duplicates, in MOODS order.
 */
export const normalizeMoods = (value: unknown): Mood[] => {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(';') : [];
  const wanted = new Set(parts.map(p => String(p).trim().toLowerCase()));
  return MOODS.filter(m => wanted.has(m.toLowerCase()));
};

export interface PickOptions {
  mood: Mood | null; // null = "Surprise me" (any record)
  decade: number | null;
  favoritesOnly: boolean;
}

export const matchesPick = (record: VinylRecord, { mood, decade, favoritesOnly }: PickOptions): boolean =>
  (mood === null || effectiveMoods(record).moods.includes(mood))
  && (decade === null || decadeOf(record.releaseYear) === decade)
  && (!favoritesOnly || record.rating >= FAVORITE_RATING);

/**
 * Draw one record for the given mood and filters. Higher-rated records are more
 * likely (weight = rating², unrated counts as 5) and the recent suggestions are
 * skipped while there are other candidates. Returns null when nothing matches.
 */
export const pickRecord = (
  records: VinylRecord[],
  options: PickOptions,
  recentIds: number[] = [],
  random: () => number = Math.random,
): VinylRecord | null => {
  const candidates = records.filter(r => matchesPick(r, options));
  if (candidates.length === 0) return null;

  const fresh = candidates.filter(r => r.id === undefined || !recentIds.includes(r.id));
  const last = recentIds[recentIds.length - 1];
  const pool = fresh.length > 0 ? fresh
    : candidates.length > 1 ? candidates.filter(r => r.id !== last)
    : candidates;

  const weights = pool.map(r => {
    const rating = r.rating > 0 ? r.rating : 5;
    return rating * rating;
  });
  let target = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < pool.length; i++) {
    target -= weights[i];
    if (target < 0) return pool[i];
  }
  return pool[pool.length - 1];
};

/** Add a suggestion to the recent list, keeping only the last RECENT_PICKS. */
export const rememberPick = (recentIds: number[], id: number): number[] =>
  [...recentIds.filter(r => r !== id), id].slice(-RECENT_PICKS);
