import { Users } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function OuvriersPage() {
  return (
    <EtatVide
      icone={Users}
      titre="Ouvriers"
      description={
        <>
          Liste filtrable par spécialité et disponibilité, fiche et planning de chaque ouvrier. Page
          réalisée dans l&apos;issue #29.
        </>
      }
    />
  );
}
