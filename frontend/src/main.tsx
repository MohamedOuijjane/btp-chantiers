import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { pannesDepuisUrl } from './api/simulation';
import { App } from './app/App';
import './index.css';

// Données fictives : pannes simulées à la demande (?panne=taches), voir api/simulation.ts.
pannesDepuisUrl(window.location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
