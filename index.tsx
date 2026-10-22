import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Notifications from './components/Notifications';
import ErrorBoundary from './components/ErrorBoundary';

// Self-hosted Playfair Display (previously loaded from Google Fonts).
// Inter was also loaded before, but it never rendered: the app root uses
// `font-sans` (system UI font), so it is not bundled.
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Last line of defence: never leave a blank page on an unexpected render error. */}
    <ErrorBoundary fallback={() => (
      <div role="alert" className="min-h-screen bg-[#d6d3d1] flex items-center justify-center p-6">
        <div className="bg-white border border-[#78350f] rounded-lg shadow-md p-8 max-w-md text-center space-y-4">
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