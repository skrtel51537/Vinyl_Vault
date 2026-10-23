import { describe, expect, it } from 'vitest';
import { coverAtSize } from '../services/image';

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
