import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Button } from '@/components/ui/button';

import { useAuth } from '../contexte';
import { PROFILS } from '../permissions';

/** Affiché à la place d'une page que le profil connecté n'a pas le droit d'ouvrir. */
export function AccesRefuse() {
  const { utilisateur } = useAuth();
  const profil = utilisateur ? PROFILS[utilisateur.role] : null;
  return (
    <EtatVide
      icone={ShieldX}
      titre="Accès refusé"
      description={
        profil
          ? `Le profil « ${profil.libelle} » n’a pas accès à cette page.`
          : 'Vous n’avez pas accès à cette page.'
      }
      action={
        <Button asChild>
          <Link to={profil?.accueil ?? '/'} className="no-underline">
            Retour à l’accueil
          </Link>
        </Button>
      }
    />
  );
}
