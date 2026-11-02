import { Bell, Moon, Search, Sun } from 'lucide-react';
import { Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useTheme } from '@/app/useTheme';
import { Button } from '@/components/ui/button';

export type Miette = { libelle: string; vers?: string };

type Props = { titre: string; fil: Miette[] };

export function Topbar({ titre, fil }: Props) {
  const { theme, basculer } = useTheme();
  const sombre = theme === 'sombre';
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
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line bg-surface px-4 py-4 sm:px-8">
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
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
        <h1 className="titre m-0 text-[30px] leading-[1.05]">{titre}</h1>
      </div>

      <label className="flex min-h-cible flex-[1_1_180px] items-center sm:flex-[0_1_260px] gap-2 rounded-btn border border-line bg-surface-2 px-3 text-muted">
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
    </header>
  );
}
