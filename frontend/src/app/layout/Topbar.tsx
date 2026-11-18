import { Bell, Moon, Search, Sun } from 'lucide-react';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useTheme } from '@/app/useTheme';
import { Button } from '@/components/ui/button';
import { MenuUtilisateur } from '@/features/auth/components/MenuUtilisateur';

import { MenuMobile } from './Sidebar';

export type Miette = { libelle: string; vers?: string };

type Props = { titre: string; fil: Miette[] };

/** Variable CSS lue par `scroll-padding-top` (index.css) : ancres et focus restent sous la barre. */
export const VAR_HAUTEUR_TOPBAR = '--hauteur-topbar';

/** Publie la hauteur réelle de la barre (elle passe sur plusieurs lignes en petit écran). */
function useHauteurPubliee() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const racine = document.documentElement.style;
    const publier = () => racine.setProperty(VAR_HAUTEUR_TOPBAR, `${el.offsetHeight}px`);
    publier();
    if (typeof ResizeObserver === 'undefined')
      return () => racine.removeProperty(VAR_HAUTEUR_TOPBAR);
    const obs = new ResizeObserver(publier);
    obs.observe(el);
    return () => {
      obs.disconnect();
      racine.removeProperty(VAR_HAUTEUR_TOPBAR);
    };
  }, []);
  return ref;
}

export function Topbar({ titre, fil }: Props) {
  const { theme, basculer } = useTheme();
  const sombre = theme === 'sombre';
  const ref = useHauteurPubliee();
  // La recherche est portée par l'URL (?q=) : chaque liste la lit et filtre ses lignes.
  const [params, setParams] = useSearchParams();
  const rechercher = (q: string) =>
    setParams(
      (p) => {
        if (q) p.set('q', q);
        else p.delete('q');
        return p;
      },
      { replace: true },
    );

  return (
    // Fixe au défilement, au-dessus du contenu (z-30) mais sous les dialogues (z-50) et les toasts.
    <header
      ref={ref}
      className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-line bg-surface px-4 py-3 sm:gap-x-4 sm:px-8 sm:py-4"
    >
      <MenuMobile />
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
        <nav aria-label="Fil d'Ariane">
          <ol className="surtitre flex flex-wrap items-center gap-1.5 text-muted">
            {fil.map((m, i) => (
              <Fragment key={m.libelle + i}>
                {i > 0 && <li aria-hidden="true">·</li>}
                <li>
                  {m.vers ? (
                    <Link to={m.vers} className="text-muted no-underline hover:text-accent-text">
                      {m.libelle}
                    </Link>
                  ) : (
                    m.libelle
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
        <h1 className="titre m-0 truncate text-[24px] leading-[1.05] sm:text-[30px]">{titre}</h1>
      </div>

      {/* Mobile : la recherche passe sur sa propre ligne, sous le titre et les boutons. */}
      <label className="order-last flex min-h-cible w-full items-center gap-2 rounded-btn border border-line bg-surface-2 px-3 text-muted md:order-none md:w-auto md:flex-[0_1_260px]">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Rechercher"
          value={params.get('q') ?? ''}
          onChange={(e) => rechercher(e.target.value)}
          placeholder="Rechercher un chantier, un ouvrier…"
          className="min-w-0 flex-1 border-none bg-transparent text-ink outline-none placeholder:text-muted"
        />
      </label>

      <Button
        variant="outline"
        size="icon"
        onClick={basculer}
        aria-label={sombre ? 'Passer en thème clair' : 'Passer en thème sombre'}
        title={sombre ? 'Thème clair' : 'Thème sombre'}
      >
        {sombre ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </Button>

      {/* La pastille rouge de la maquette apparaîtra avec les alertes de stock (#26, #30). */}
      <Button variant="outline" size="icon" aria-label="Notifications">
        <Bell size={20} aria-hidden="true" />
      </Button>

      <MenuUtilisateur />
    </header>
  );
}
