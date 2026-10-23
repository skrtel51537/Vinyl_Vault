import { describe, expect, it } from 'vitest';
import { sanitizeExternalLink } from '../services/url';

describe('sanitizeExternalLink', () => {
  it('keeps http and https links unchanged', () => {
    expect(sanitizeExternalLink('https://www.discogs.com/release/1')).toBe('https://www.discogs.com/release/1');
    expect(sanitizeExternalLink('http://example.com/a?b=c')).toBe('http://example.com/a?b=c');
  });

  it('blocks dangerous schemes', () => {
    expect(sanitizeExternalLink('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalLink('JavaScript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalLink('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(sanitizeExternalLink('file:///etc/passwd')).toBeUndefined();
    expect(sanitizeExternalLink('vbscript:msgbox')).toBeUndefined();
  });

  it('returns undefined for empty, missing or unparseable input', () => {
    expect(sanitizeExternalLink('')).toBeUndefined();
    expect(sanitizeExternalLink(null)).toBeUndefined();
    expect(sanitizeExternalLink(undefined)).toBeUndefined();
    expect(sanitizeExternalLink('www.discogs.com/release/1')).toBeUndefined();
    expect(sanitizeExternalLink('not a url')).toBeUndefined();
  });
});
