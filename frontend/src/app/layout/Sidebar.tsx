import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Building2,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  Menu,
  Package,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
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

/** Logo et nom de l'entreprise, en tête de la barre latérale et du menu mobile. */
function Marque() {
  return (
    <div className="flex items-center gap-3 px-5 py-[22px]">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[#F59E0B] text-[#1C1917]">
        <HardHat size={24} aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-[21px] font-bold uppercase leading-none tracking-[0.04em]">
          BTP Chantiers
        </span>
        <span className="text-[13px] text-side-muted">Souss Bâtiment</span>
      </span>
    </div>
  );
}

/** Liens du menu, filtrés selon le profil connecté. */
function Navigation() {
  const { voit } = useDroits();
  const sections = SECTIONS.map((s) => ({
    ...s,
    liens: s.liens.filter((l) => voit(l.section)),
  })).filter((s) => s.liens.length > 0);
  // Pastille de la maquette : nombre de matériaux en alerte (stock ≤ seuil).
  const alertes = useMateriaux(true).data?.length ?? 0;

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-1 px-3 pb-6 pt-2">
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
  );
}

/**
 * Barre latérale des grands écrans (≥ 1024 px) : fixe à gauche sur toute la hauteur,
 * avec son propre défilement si le menu dépasse l'écran.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col overflow-y-auto overscroll-contain bg-side text-side-ink lg:flex">
      <div className="bande-danger h-2 flex-none" aria-hidden="true" />
      <Marque />
      <Navigation />
    </aside>
  );
}

/** Petits écrans : bouton « Menu » de la barre du haut, qui ouvre la navigation en tiroir. */
export function MenuMobile() {
  const [ouvert, setOuvert] = useState(false);
  const { pathname } = useLocation();

  // Une page choisie dans le tiroir le referme.
  useEffect(() => setOuvert(false), [pathname]);

  return (
    <DialogPrimitive.Root open={ouvert} onOpenChange={setOuvert}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="outline" size="icon" aria-label="Ouvrir le menu" className="lg:hidden">
          <Menu size={20} aria-hidden="true" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(28,25,23,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-[rgba(0,0,0,0.65)] lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,85vw)] flex-col overflow-y-auto overscroll-contain bg-side text-side-ink shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <div className="bande-danger h-2 flex-none" aria-hidden="true" />
          <div className="flex items-center justify-between pr-3">
            <Marque />
            <DialogPrimitive.Close
              aria-label="Fermer le menu"
              className="flex h-11 w-11 items-center justify-center rounded-btn text-side-muted hover:bg-side-active hover:text-side-ink"
            >
              <X size={20} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <Navigation />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
