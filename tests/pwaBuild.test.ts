import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildHash, precacheList, renderServiceWorker, SERVICE_WORKER_FILE, webManifest } from '../pwa/build';

const root = path.resolve(import.meta.dirname, '..');
const template = readFileSync(path.join(root, 'pwa/sw.template.js'), 'utf8');

describe('webManifest', () => {
  const manifest = webManifest();

  it('has what browsers need to install the app', () => {
    expect(manifest.name).toBe('Vinyl Vault');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    // Relative to the manifest, so they follow the GitHub Pages path.
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    const sizes = manifest.icons.filter(icon => icon.purpose === 'any' && icon.type === 'image/png').map(icon => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some(icon => icon.purpose === 'maskable')).toBe(true);
  });

  it('points at icons that exist in public/', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(path.join(root, 'public', icon.src)), icon.src).toBe(true);
    }
  });
});

describe('precacheList', () => {
  it('keeps every built file once, sorted, with forward slashes', () => {
    expect(precacheList(['index.html', 'assets\\index-abc.js', 'favicon.svg', 'index.html']))
      .toEqual(['assets/index-abc.js', 'favicon.svg', 'index.html']);
  });

  it('leaves out the service worker, source maps and hidden files', () => {
    expect(precacheList([SERVICE_WORKER_FILE, 'assets/index-abc.js.map', '.vite/manifest.json', 'index.html']))
      .toEqual(['index.html']);
  });
});

describe('buildHash', () => {
  const files = [{ name: 'index.html', content: '<html>' }, { name: 'icons/a.png', content: new Uint8Array([1, 2]) }];

  it('is the same for the same files, in any order', () => {
    expect(buildHash(files)).toBe(buildHash([...files].reverse()));
  });

  it('changes when a file changes', () => {
    expect(buildHash([files[0], { name: 'icons/a.png', content: new Uint8Array([1, 3]) }])).not.toBe(buildHash(files));
  });
});

describe('renderServiceWorker', () => {
  it('fills in the file list and the version, and stays valid JavaScript', () => {
    const code = renderServiceWorker(template, ['index.html', 'assets/a$&b.js'], '1.7.0-abc');
    expect(code).not.toContain('__PRECACHE__');
    expect(code).not.toContain('__CACHE_VERSION__');
    expect(code).toContain('const PRECACHE = ["index.html","assets/a$&b.js"];');
    expect(code).toContain('const CACHE_VERSION = "1.7.0-abc";');
    expect(() => new Function(code)).not.toThrow();
  });

  it('refuses a template without the placeholders', () => {
    expect(() => renderServiceWorker('const PRECACHE = [];', [], 'v')).toThrow(/__PRECACHE__/);
  });
});
