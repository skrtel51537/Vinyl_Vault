import { describe, expect, it } from 'vitest';
import { pickVividColor } from '../services/color';

type Rgba = [number, number, number, number?];
/** Build RGBA pixel data from [color, howManyPixels] pairs. */
const pixels = (...groups: [Rgba, number][]) =>
  groups.flatMap(([[r, g, b, a = 255], n]) => Array.from({ length: n }, () => [r, g, b, a]).flat());

describe('pickVividColor', () => {
  it('prefers a vivid accent over a larger dull background', () => {
    // Mostly grey-brown cover with a red title: averaging would give mud.
    const data = pixels([[110, 100, 90], 80], [[220, 30, 40], 20]);
    expect(pickVividColor(data)).toBe('rgb(220, 30, 40)');
  });

  it('picks the hue group with the most colorfulness and averages it', () => {
    const data = pixels([[0, 0, 200], 10], [[0, 0, 240], 10], [[240, 200, 0], 5]);
    expect(pickVividColor(data)).toBe('rgb(0, 0, 220)');
  });

  it('ignores transparent and near-black pixels', () => {
    const data = pixels([[255, 0, 0, 0], 50], [[20, 0, 0], 50], [[30, 160, 60], 5]);
    expect(pickVividColor(data)).toBe('rgb(30, 160, 60)');
  });

  it('falls back to the average for black-and-white covers', () => {
    const data = pixels([[0, 0, 0], 1], [[200, 200, 200], 1]);
    expect(pickVividColor(data)).toBe('rgb(100, 100, 100)');
  });

  it('returns undefined when there is nothing opaque', () => {
    expect(pickVividColor([])).toBeUndefined();
    expect(pickVividColor(pixels([[255, 0, 0, 0], 4]))).toBeUndefined();
  });

  it('always returns the format the backup validator accepts', () => {
    const data = pixels([[13, 254, 77], 3], [[251, 3, 129], 2]);
    expect(pickVividColor(data)).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/);
  });
});
