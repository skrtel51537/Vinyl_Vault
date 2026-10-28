import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, getWaitingWorker, registerServiceWorker, subscribeToUpdate, watchForUpdate } from '../services/pwa';

type FakeWorker = EventTarget & { state: string; postMessage: ReturnType<typeof vi.fn> };
type FakeRegistration = EventTarget & { waiting: FakeWorker | null; installing: FakeWorker | null; update: () => Promise<void> };

const fakeWorker = (state = 'installing'): FakeWorker =>
  Object.assign(new EventTarget(), { state, postMessage: vi.fn() });

const fakeRegistration = (waiting: FakeWorker | null = null): FakeRegistration =>
  Object.assign(new EventTarget(), { waiting, installing: null, update: () => Promise.resolve() });

/** A new version starts installing and then finishes. */
const installNewVersion = (registration: FakeRegistration): FakeWorker => {
  const worker = fakeWorker();
  registration.installing = worker;
  registration.dispatchEvent(new Event('updatefound'));
  worker.state = 'installed';
  worker.dispatchEvent(new Event('statechange'));
  return worker;
};

const watch = (registration: FakeRegistration, hasController: boolean) => {
  const onWaiting = vi.fn();
  watchForUpdate(registration as unknown as ServiceWorkerRegistration, () => hasController, onWaiting);
  return onWaiting;
};

describe('watchForUpdate', () => {
  it('stays quiet on the very first install', () => {
    const registration = fakeRegistration();
    const onWaiting = watch(registration, false);
    installNewVersion(registration);
    expect(onWaiting).not.toHaveBeenCalled();
  });

  it('reports a new version once it has installed', () => {
    const registration = fakeRegistration();
    const onWaiting = watch(registration, true);
    const worker = installNewVersion(registration);
    expect(onWaiting).toHaveBeenCalledWith(worker);
  });

  it('reports a version that was already waiting when the app opened', () => {
    const waiting = fakeWorker('installed');
    expect(watch(fakeRegistration(waiting), true)).toHaveBeenCalledWith(waiting);
  });
});

describe('registerServiceWorker', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.useRealTimers();
  });

  it('does nothing without a service worker URL (dev server, local builds)', async () => {
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    await registerServiceWorker('');
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing in browsers without service workers', async () => {
    await expect(registerServiceWorker('/Vinyl_Vault/sw.js')).resolves.toBeUndefined();
  });

  it('shows a waiting version and switches to it on request', async () => {
    vi.useFakeTimers();
    const waiting = fakeWorker('installed');
    const container = Object.assign(new EventTarget(), {
      controller: {},
      register: vi.fn().mockResolvedValue(fakeRegistration(waiting)),
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
    const listener = vi.fn();
    const unsubscribe = subscribeToUpdate(listener);

    await registerServiceWorker('/Vinyl_Vault/sw.js');
    expect(container.register).toHaveBeenCalledWith('/Vinyl_Vault/sw.js');
    expect(getWaitingWorker()).toBe(waiting);
    expect(listener).toHaveBeenCalled();

    applyUpdate();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    unsubscribe();
  });
});
