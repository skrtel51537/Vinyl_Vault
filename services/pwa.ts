/**
 * Offline support for the GitHub Pages build: registers the service worker and tells
 * the app when a new version is ready, so the user decides when to reload.
 *
 * Only that build has a service worker: __SERVICE_WORKER_URL__ is empty in `npm run dev`
 * and in local builds, so localhost is never cached.
 */

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

/** For useSyncExternalStore: the new version waiting to take over, if any. */
export const getWaitingWorker = (): ServiceWorker | null => waitingWorker;

export const subscribeToUpdate = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setWaitingWorker = (worker: ServiceWorker): void => {
  waitingWorker = worker;
  listeners.forEach(listener => listener());
};

/**
 * Call `onWaiting` once a new version has finished installing and is waiting. Not on the
 * very first install (`hasController()` is false then): there is no old version to replace.
 */
export const watchForUpdate = (
  registration: ServiceWorkerRegistration,
  hasController: () => boolean,
  onWaiting: (worker: ServiceWorker) => void,
): void => {
  if (registration.waiting && hasController()) onWaiting(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && hasController()) onWaiting(worker);
    });
  });
};

// Browsers look for a new version each time the app is opened; one left open also checks hourly.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export const registerServiceWorker = async (url: string = __SERVICE_WORKER_URL__): Promise<void> => {
  if (!url || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(url);
    watchForUpdate(registration, () => navigator.serviceWorker.controller !== null, setWaitingWorker);
    setInterval(() => registration.update().catch(() => { /* offline: try again later */ }), UPDATE_CHECK_MS);
  } catch (error) {
    console.error('Could not register the service worker', error);
  }
};

/** Switch to the waiting version and reload the page once it has taken over. */
export const applyUpdate = (): void => {
  const worker = waitingWorker;
  if (!worker) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  worker.postMessage({ type: 'SKIP_WAITING' });
};
