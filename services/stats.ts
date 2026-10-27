import { VinylRecord } from '../types';

// Genres so generic they appear on most records and would crowd out the rest of the statistics.
const IGNORED_GENRES = new Set(['rock']);

/** How many records have each genre, most frequent first. Ignored genres are left out. */
export const genreCounts = (records: VinylRecord[]): { name: string; value: number }[] => {
  const genreMap = new Map<string, number>();
  records.forEach(v => {
    v.genre.forEach(g => {
      if (IGNORED_GENRES.has(g.trim().toLowerCase())) return;
      genreMap.set(g, (genreMap.get(g) || 0) + 1);
    });
  });
  return Array.from(genreMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

/** The most common genres, most frequent first. Ignored genres are left out. */
export const topGenres = (records: VinylRecord[], limit = 6): { name: string; value: number }[] =>
  genreCounts(records).slice(0, limit);

/** How many records come from each decade ("1970s"…), oldest first. Records without a year are left out. */
export const decadeCounts = (records: VinylRecord[]): { name: string; count: number }[] => {
  const decadeMap = new Map<string, number>();
  records.forEach(v => {
    if (v.releaseYear) {
      const key = `${Math.floor(v.releaseYear / 10) * 10}s`;
      decadeMap.set(key, (decadeMap.get(key) || 0) + 1);
    }
  });
  return Array.from(decadeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/** Average rating (out of 10) of the rated records, rounded to one decimal; null when none is rated. */
export const averageRating = (records: VinylRecord[]): number | null => {
  const rated = records.filter(r => r.rating > 0);
  if (rated.length === 0) return null;
  return Math.round(rated.reduce((sum, r) => sum + r.rating, 0) / rated.length * 10) / 10;
};
