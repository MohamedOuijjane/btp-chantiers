import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { useAuth } from '../contexte';
import { PROFILS } from '../permissions';

/** Topbar : nom et profil de l'utilisateur connecté, bouton « Déconnexion ». */
export function MenuUtilisateur() {
  const { utilisateur, deconnecter } = useAuth();
  const [enCours, setEnCours] = useState(false);
  if (!utilisateur) return null;

  const quitter = async () => {
    setEnCours(true);
    await deconnecter(); // la garde de routes renvoie alors vers /connexion
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2.5"
        aria-label="Utilisateur connecté"
        role="group"
        title={`${utilisateur.nom} · ${PROFILS[utilisateur.role].libelle}`}
      >
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent font-bold text-accent-on"
        >
          {utilisateur.initiales}
        </span>
        {/* Nom et profil visibles à partir de 1280 px ; toujours lus par les lecteurs d'écran. */}
        <span className="sr-only xl:not-sr-only xl:flex xl:min-w-0 xl:flex-col xl:leading-tight">
          <span className="font-bold">{utilisateur.nom}</span>
          <span className="text-[13px] text-muted">{PROFILS[utilisateur.role].libelle}</span>
        </span>
      </div>
      <Button
        variant="outline"
        onClick={quitter}
        disabled={enCours}
        title="Déconnexion"
        className="w-11 px-0 sm:w-auto sm:px-4"
      >
        <LogOut size={18} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Déconnexion</span>
      </Button>
    </div>
  );
}
