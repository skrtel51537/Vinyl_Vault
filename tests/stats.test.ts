import { describe, expect, it } from 'vitest';
import { averageRating, decadeCounts, topGenres } from '../services/stats';
import { makeRecord } from './fixtures';

describe('topGenres', () => {
  it('counts genres, most frequent first, and leaves "Rock" out', () => {
    const records = [
      makeRecord({ genre: ['Rock', 'Stoner'] }),
      makeRecord({ genre: ['rock ', 'Stoner', 'Psychedelic'] }),
      makeRecord({ genre: ['ROCK', 'Psychedelic', 'Blues'] }),
      makeRecord({ genre: ['Stoner'] }),
    ];
    expect(topGenres(records)).toEqual([
      { name: 'Stoner', value: 3 },
      { name: 'Psychedelic', value: 2 },
      { name: 'Blues', value: 1 },
    ]);
  });

  it('keeps genres that only contain the word rock', () => {
    expect(topGenres([makeRecord({ genre: ['Psychedelic Rock', 'Rock'] })])).toEqual([{ name: 'Psychedelic Rock', value: 1 }]);
  });

  it('counts records per decade, oldest first, skipping unknown years', () => {
    const records = [1994, 1971, 1975, null, 1969].map(releaseYear => makeRecord({ releaseYear }));
    expect(decadeCounts(records)).toEqual([{ name: '1960s', count: 1 }, { name: '1970s', count: 2 }, { name: '1990s', count: 1 }]);
  });

  it('averages the rated records only', () => {
    expect(averageRating([8, 0, 7].map(rating => makeRecord({ rating })))).toBe(7.5);
    expect(averageRating([makeRecord({ rating: 0 })])).toBeNull();
  });

  it('returns at most the requested number of genres', () => {
    const records = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => makeRecord({ genre: [g] }));
    expect(topGenres(records)).toHaveLength(6);
    expect(topGenres(records, 3)).toHaveLength(3);
  });
});
