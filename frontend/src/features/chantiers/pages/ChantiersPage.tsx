import { Building2 } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function ChantiersPage() {
  return (
    <EtatVide
      icone={Building2}
      titre="Liste des chantiers"
      description={
        <>
          Tableau filtrable par statut, recherche et création d’un chantier. Page réalisée dans
          l&apos;issue #27.
        </>
      }
    />
  );
}
