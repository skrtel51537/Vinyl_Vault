/** App version from package.json, injected at build time by Vite (`define` in vite.config.ts). */
declare const __APP_VERSION__: string;

/** Service worker URL in the GitHub Pages build; empty everywhere else (no offline cache). */
declare const __SERVICE_WORKER_URL__: string;
