import { ClipboardList } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function ChantierFichePage() {
  return (
    <EtatVide
      icone={ClipboardList}
      titre="Fiche chantier"
      description={
        <>
          En-tête du chantier, onglets Tâches et Matériaux consommés, actions Modifier, Clôturer et
          Supprimer. Page réalisée dans l&apos;issue #27.
        </>
      }
    />
  );
}
