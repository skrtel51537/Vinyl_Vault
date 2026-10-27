import { describe, expect, it } from 'vitest';
import { topGenres } from '../services/stats';
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

  it('returns at most the requested number of genres', () => {
    const records = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => makeRecord({ genre: [g] }));
    expect(topGenres(records)).toHaveLength(6);
    expect(topGenres(records, 3)).toHaveLength(3);
  });
});
