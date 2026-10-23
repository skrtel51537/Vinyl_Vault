import { describe, expect, it } from 'vitest';
import { coverAtSize, fitWithin } from '../services/image';

describe('coverAtSize', () => {
  const itunes = 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ab/cd/source/600x600bb.jpg';

  it('rewrites the size of iTunes artwork URLs', () => {
    expect(coverAtSize(itunes, 100)).toBe('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ab/cd/source/100x100bb.jpg');
    expect(coverAtSize(itunes.replace('.jpg', '.png'), 300)).toMatch(/\/300x300bb\.png$/);
  });

  it('leaves other URLs unchanged', () => {
    const data = 'data:image/jpeg;base64,AAAA';
    expect(coverAtSize(data, 100)).toBe(data);
    expect(coverAtSize('https://example.com/600x600bb.jpg', 100)).toBe('https://example.com/600x600bb.jpg');
    // Only the mzstatic.com host counts, not a lookalike path.
    expect(coverAtSize('https://evil.com/mzstatic.com/600x600bb.jpg', 100)).toBe('https://evil.com/mzstatic.com/600x600bb.jpg');
  });

  it('passes empty input through', () => {
    expect(coverAtSize(undefined, 100)).toBeUndefined();
    expect(coverAtSize('', 100)).toBe('');
  });
});

describe('fitWithin', () => {
  it('scales large images down keeping the aspect ratio', () => {
    expect(fitWithin(3000, 3000, 600)).toEqual({ width: 600, height: 600 });
    expect(fitWithin(4032, 3024, 600)).toEqual({ width: 600, height: 450 });
    expect(fitWithin(1000, 2000, 600)).toEqual({ width: 300, height: 600 });
  });

  it('never upscales small images', () => {
    expect(fitWithin(300, 200, 600)).toEqual({ width: 300, height: 200 });
    expect(fitWithin(600, 600, 600)).toEqual({ width: 600, height: 600 });
  });

  it('keeps at least one pixel per side', () => {
    expect(fitWithin(10000, 1, 600)).toEqual({ width: 600, height: 1 });
  });
});
