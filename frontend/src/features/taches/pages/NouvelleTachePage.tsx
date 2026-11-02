import { ListPlus } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function NouvelleTachePage() {
  return (
    <EtatVide
      icone={ListPlus}
      titre="Nouvelle tâche"
      description={
        <>
          Formulaire de création avec vérification du chantier, des ouvriers et du stock. Page
          réalisée dans l&apos;issue #28.
        </>
      }
    />
  );
}
