import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Notifications from './components/Notifications';
import ErrorBoundary from './components/ErrorBoundary';

// Self-hosted variable fonts: one file per family covers every weight in use,
// so bold text renders with true bold glyphs instead of synthesized ones.
// Inter (UI text, with optical sizing) + Playfair Display (headings).
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './index.css';
import { initTheme } from './services/theme';

// Set the light/dark theme before the first render, so the app never flashes the wrong one.
initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Last line of defence: never leave a blank page on an unexpected render error. */}
    <ErrorBoundary fallback={() => (
      <div role="alert" className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="bg-paper border border-[#78350f] rounded-lg shadow-md p-8 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-serif font-bold text-stone-800">Something went wrong</h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            Vinyl Vault hit an unexpected error. Your collection is stored in this browser and is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-sm bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold uppercase tracking-wider shadow-md transition-colors"
          >
            Reload app
          </button>
        </div>
      </div>
    )}>
      <App />
    </ErrorBoundary>
    <Notifications />
  </React.StrictMode>
);