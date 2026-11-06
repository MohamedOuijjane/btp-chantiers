import { estReel, modeApi } from './mode';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('mode des modules (VITE_API_*)', () => {
  it('fictif par défaut', () => {
    vi.stubEnv('VITE_API_MODE', '');
    vi.stubEnv('VITE_API_CHANTIERS', '');
    expect(modeApi('chantiers')).toBe('fictif');
    expect(estReel('chantiers')).toBe(false);
  });

  it('la variable du module l’emporte sur VITE_API_MODE', () => {
    vi.stubEnv('VITE_API_MODE', 'fictif');
    vi.stubEnv('VITE_API_CHANTIERS', 'reel');
    vi.stubEnv('VITE_API_TACHES', '');
    expect(modeApi('chantiers')).toBe('reel');
    expect(modeApi('taches')).toBe('fictif');
  });

  it('VITE_API_MODE s’applique aux modules sans variable propre', () => {
    vi.stubEnv('VITE_API_MODE', 'reel');
    vi.stubEnv('VITE_API_OUVRIERS', '');
    expect(modeApi('ouvriers')).toBe('reel');
  });

  it('une valeur inconnue est ignorée', () => {
    vi.stubEnv('VITE_API_MODE', 'fictif');
    vi.stubEnv('VITE_API_MATERIAUX', 'REEL');
    expect(modeApi('materiaux')).toBe('fictif');
  });
});
