import { useCallback, useEffect, useState } from 'react';

export type Theme = 'clair' | 'sombre';

export const CLE_THEME = 'btp-theme';
const REQUETE_SOMBRE = '(prefers-color-scheme: dark)';

function lireChoix(): Theme | null {
  try {
    const t = localStorage.getItem(CLE_THEME);
    return t === 'clair' || t === 'sombre' ? t : null;
  } catch {
    return null;
  }
}

function themeSysteme(): Theme {
  return window.matchMedia?.(REQUETE_SOMBRE).matches ? 'sombre' : 'clair';
}

function appliquer(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'sombre');
}

/**
 * Thème clair / sombre : suit la préférence du système tant que l'utilisateur n'a rien choisi,
 * puis mémorise son choix (localStorage).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => lireChoix() ?? themeSysteme());

  useEffect(() => appliquer(theme), [theme]);

  // Sans choix mémorisé, on suit les changements de préférence du système.
  useEffect(() => {
    const mq = window.matchMedia?.(REQUETE_SOMBRE);
    if (!mq) return;
    const suivre = (e: MediaQueryListEvent) => {
      if (!lireChoix()) setTheme(e.matches ? 'sombre' : 'clair');
    };
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, []);

  const basculer = useCallback(() => {
    setTheme((actuel) => {
      const suivant: Theme = actuel === 'sombre' ? 'clair' : 'sombre';
      try {
        localStorage.setItem(CLE_THEME, suivant);
      } catch {
        // stockage indisponible (navigation privée) : le choix vaut pour la session
      }
      return suivant;
    });
  }, []);

  return { theme, basculer };
}
