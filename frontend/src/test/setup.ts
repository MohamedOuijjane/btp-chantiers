import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { reinitialiserDonneesFictives } from '@/api/donnees-fictives';
import { reinitialiserPannes } from '@/api/simulation';

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
