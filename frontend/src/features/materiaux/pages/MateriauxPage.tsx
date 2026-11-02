import { Package } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function MateriauxPage() {
  return (
    <EtatVide
      icone={Package}
      titre="Matériaux"
      description={
        <>
          Stock avec alertes, ajout d’un matériau et mouvements d’entrée ou de sortie (SOAP). Page
          réalisée dans l&apos;issue #30.
        </>
      }
    />
  );
}
