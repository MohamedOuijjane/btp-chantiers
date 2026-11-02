import { LayoutDashboard } from 'lucide-react';

import { EtatVide } from '@/components/common/EtatVide';

export function DashboardPage() {
  return (
    <EtatVide
      icone={LayoutDashboard}
      titre="Tableau de bord"
      description={
        <>
          Indicateurs, avancement des chantiers en cours, alertes de stock et répartition des
          chantiers. Page réalisée dans l&apos;issue #26.
        </>
      }
    />
  );
}
