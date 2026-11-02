import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

import { reinitialiserDonneesFictives } from '@/api/donnees-fictives';
import { reinitialiserPannes } from '@/api/simulation';

// findBy… et waitFor attendent 1 s par défaut : trop court pour afficher une page complète
// quand toute la suite tourne en parallèle (CI, poste chargé). Reste sous testTimeout (15 s).
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.classList.remove('dark');
  reinitialiserDonneesFictives();
  reinitialiserPannes();
});

// jsdom ne fournit pas matchMedia : préférence système « clair » par défaut.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
