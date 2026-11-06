/// <reference types="vite/client" />

type ModeApiEnv = 'fictif' | 'reel';

interface ImportMetaEnv {
  /** Mode par défaut de tous les modules (fictif si absent). */
  readonly VITE_API_MODE?: ModeApiEnv;
  readonly VITE_API_CHANTIERS?: ModeApiEnv;
  readonly VITE_API_TACHES?: ModeApiEnv;
  readonly VITE_API_OUVRIERS?: ModeApiEnv;
  readonly VITE_API_MATERIAUX?: ModeApiEnv;
  readonly VITE_API_AUTH?: ModeApiEnv;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
