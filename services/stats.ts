import { VinylRecord } from '../types';

// Genres so generic they appear on most records and would crowd out the rest of the chart.
const IGNORED_GENRES = new Set(['rock']);

/** The most common genres, most frequent first. Ignored genres are left out. */
export const topGenres = (records: VinylRecord[], limit = 6): { name: string; value: number }[] => {
  const genreMap = new Map<string, number>();
  records.forEach(v => {
    v.genre.forEach(g => {
      if (IGNORED_GENRES.has(g.trim().toLowerCase())) return;
      genreMap.set(g, (genreMap.get(g) || 0) + 1);
    });
  });
  return Array.from(genreMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};
