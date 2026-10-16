import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* Visitor counts on the website only (Vercel Web Analytics: no cookies, no personal data). */}
    {location.hostname.endsWith('.vercel.app') && <Analytics />}
  </React.StrictMode>
);

// Lets ARIA be installed as an app and open offline (only in the published build).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
