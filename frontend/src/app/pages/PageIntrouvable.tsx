import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Button } from '@/components/ui/button';

export function PageIntrouvable() {
  return (
    <EtatVide
      icone={MapPinOff}
      titre="Page introuvable"
      description="L'adresse demandée ne correspond à aucune page de l'application."
      action={
        <Button asChild>
          <Link to="/" className="no-underline">
            Retour au tableau de bord
          </Link>
        </Button>
      }
    />
  );
}
