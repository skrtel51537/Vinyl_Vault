import { describe, expect, it } from 'vitest';
import { autoMoods, decadeOf, effectiveMoods, normalizeMoods, pickRecord, rememberPick, RECENT_PICKS } from '../services/moods';
import { makeRecord } from './fixtures';

describe('autoMoods', () => {
  it('guesses moods from genre keywords, in a stable order', () => {
    expect(autoMoods({ genre: ['Jazz'], releaseYear: 1959 })).toEqual(['Night']);
    expect(autoMoods({ genre: ['Disco', 'Funk / Soul'], releaseYear: 1978 })).toEqual(['Night', 'Party']);
    expect(autoMoods({ genre: ['Indie Rock'], releaseYear: 2005 })).toEqual(['Energy', 'Melancholy']);
    expect(autoMoods({ genre: ['Ambient'], releaseYear: null })).toEqual(['Relax']);
  });

  it('uses the decade: 70s/80s pop and rock are party records', () => {
    expect(autoMoods({ genre: ['Rock'], releaseYear: 1983 })).toEqual(['Energy', 'Party']);
    expect(autoMoods({ genre: ['Rock'], releaseYear: 1995 })).toEqual(['Energy']);
  });

  it('returns no mood when nothing matches', () => {
    expect(autoMoods({ genre: ['Spoken Word'], releaseYear: 1990 })).toEqual([]);
    expect(autoMoods({ genre: [], releaseYear: null })).toEqual([]);
  });
});

describe('effectiveMoods', () => {
  it('prefers moods set by hand over guessed ones', () => {
    expect(effectiveMoods(makeRecord({ genre: ['Jazz'], moods: ['Party'] }))).toEqual({ moods: ['Party'], auto: false });
    expect(effectiveMoods(makeRecord({ genre: ['Jazz'], moods: [] }))).toEqual({ moods: ['Night'], auto: true });
    expect(effectiveMoods(makeRecord({ genre: ['Jazz'] }))).toEqual({ moods: ['Night'], auto: true });
  });
});

describe('normalizeMoods', () => {
  it('accepts lists and ";" text, ignoring case, unknown values and duplicates', () => {
    expect(normalizeMoods(['night', 'Relax', 'NIGHT', 'Sleepy', 3])).toEqual(['Relax', 'Night']);
    expect(normalizeMoods(' party ;melancholy; ')).toEqual(['Party', 'Melancholy']);
    expect(normalizeMoods(undefined)).toEqual([]);
    expect(normalizeMoods({ Relax: true })).toEqual([]);
  });
});

describe('decadeOf', () => {
  it('rounds down to the decade', () => {
    expect(decadeOf(1959)).toBe(1950);
    expect(decadeOf(2000)).toBe(2000);
    expect(decadeOf(null)).toBeNull();
  });
});

describe('pickRecord', () => {
  const shelf = [
    makeRecord({ id: 1, album: 'Kind of Blue', genre: ['Jazz'], releaseYear: 1959, rating: 10 }),
    makeRecord({ id: 2, album: 'Discovery', genre: ['House'], releaseYear: 2001, rating: 6 }),
    makeRecord({ id: 3, album: 'Thriller', genre: ['Pop'], releaseYear: 1982, rating: 9 }),
    makeRecord({ id: 4, album: 'Talk', genre: ['Spoken Word'], releaseYear: 1990, rating: 0, moods: ['Relax'] }),
  ];
  const any = { mood: null, decade: null, favoritesOnly: false };
  const first = () => 0;

  it('only picks records that match the mood and filters', () => {
    expect(pickRecord(shelf, { ...any, mood: 'Party' }, [], first)?.id).toBe(2);
    expect(pickRecord(shelf, { ...any, mood: 'Party', decade: 1980 }, [], first)?.id).toBe(3);
    expect(pickRecord(shelf, { ...any, mood: 'Relax' }, [], first)?.id).toBe(4);
    expect(pickRecord(shelf, { ...any, favoritesOnly: true, decade: 2000 }, [], first)).toBeNull();
    expect(pickRecord([], any)).toBeNull();
  });

  it('weights by rating (squared; unrated counts as 5)', () => {
    // Weights: 100, 36, 81, 25 (total 242).
    expect(pickRecord(shelf, any, [], () => 99.5 / 242)?.id).toBe(1);
    expect(pickRecord(shelf, any, [], () => 100.5 / 242)?.id).toBe(2);
    expect(pickRecord(shelf, any, [], () => 136.5 / 242)?.id).toBe(3);
    expect(pickRecord(shelf, any, [], () => 0.999)?.id).toBe(4);
  });

  it('avoids recent suggestions, but never runs out of records', () => {
    expect(pickRecord(shelf, any, [1, 2, 3], first)?.id).toBe(4);
    // Everything was suggested recently: anything but the very last one.
    expect(pickRecord(shelf, any, [1, 2, 3, 4], () => 0.999)?.id).toBe(3);
    // A single candidate is always returned.
    expect(pickRecord(shelf, { ...any, mood: 'Relax' }, [4], first)?.id).toBe(4);
  });

  it('remembers only the latest suggestions', () => {
    let recent: number[] = [];
    for (let id = 1; id <= RECENT_PICKS + 2; id++) recent = rememberPick(recent, id);
    expect(recent).toHaveLength(RECENT_PICKS);
    expect(recent[recent.length - 1]).toBe(RECENT_PICKS + 2);
    expect(rememberPick([1, 2, 3], 1)).toEqual([2, 3, 1]);
  });
});
