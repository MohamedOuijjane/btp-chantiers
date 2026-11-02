import {
  Building2,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Package,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useDroits } from '@/features/auth/contexte';
import type { Section } from '@/features/auth/permissions';
import { useMateriaux } from '@/features/materiaux/hooks';
import { cn } from '@/lib/utils';

type Lien = { vers: string; libelle: string; icone: LucideIcon; section: Section; exact?: boolean };

const SECTIONS: { titre: string; liens: Lien[] }[] = [
  {
    titre: 'Pilotage',
    liens: [
      {
        vers: '/',
        libelle: 'Tableau de bord',
        icone: LayoutDashboard,
        section: 'dashboard',
        exact: true,
      },
      { vers: '/chantiers', libelle: 'Chantiers', icone: Building2, section: 'chantiers' },
      { vers: '/taches', libelle: 'Tâches', icone: ClipboardList, section: 'taches' },
    ],
  },
  {
    titre: 'Ressources',
    liens: [
      { vers: '/ouvriers', libelle: 'Ouvriers', icone: Users, section: 'ouvriers' },
      { vers: '/materiaux', libelle: 'Matériaux', icone: Package, section: 'materiaux' },
    ],
  },
];

export function Sidebar() {
  // Le menu ne montre que les sections du profil connecté.
  const { voit } = useDroits();
  const sections = SECTIONS.map((s) => ({
    ...s,
    liens: s.liens.filter((l) => voit(l.section)),
  })).filter((s) => s.liens.length > 0);
  // Pastille de la maquette : nombre de matériaux en alerte (stock ≤ seuil).
  const alertes = useMateriaux(true).data?.length ?? 0;
  return (
    <aside className="flex flex-[1_1_248px] flex-col bg-side text-side-ink">
      <div className="bande-danger h-2" aria-hidden="true" />

      <div className="flex items-center gap-3 px-5 py-[22px]">
        <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-[#F59E0B] text-[#1C1917]">
          <HardHat size={24} aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[21px] font-bold uppercase leading-none tracking-[0.04em]">
            BTP Chantiers
          </span>
          <span className="text-[13px] text-side-muted">Souss Bâtiment</span>
        </span>
      </div>

      <nav aria-label="Navigation principale" className="flex flex-col gap-1 px-3 py-2">
        {sections.map((section, i) => (
          <div key={section.titre} className="flex flex-col gap-1">
            <span
              className={cn('surtitre px-2.5 pb-1.5 text-side-muted', i === 0 ? 'pt-2' : 'pt-3.5')}
            >
              {section.titre}
            </span>
            {section.liens.map(({ vers, libelle, icone: Icone, exact }) => (
              <NavLink
                key={vers}
                to={vers}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-cible items-center gap-3 rounded-btn px-3 font-semibold no-underline transition-colors',
                    isActive
                      ? 'bg-side-active text-white'
                      : 'text-side-muted hover:bg-side-active/60 hover:text-side-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icone
                      size={20}
                      aria-hidden="true"
                      className={isActive ? 'text-[#F59E0B]' : 'text-side-muted'}
                    />
                    {libelle}
                    {vers === '/materiaux' && alertes > 0 && (
                      <span className="ml-auto min-w-[22px] rounded-full bg-[#F59E0B] px-[7px] py-0.5 text-center text-xs font-bold text-[#1C1917]">
                        <span aria-hidden="true">{alertes}</span>
                        <span className="sr-only">, {alertes} en alerte</span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
