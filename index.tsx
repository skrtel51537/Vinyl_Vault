import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Notifications from './components/Notifications';

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
    <App />
    <Notifications />
  </React.StrictMode>
);