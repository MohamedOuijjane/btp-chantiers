import { ClipboardList } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Skeleton } from '@/components/ui/skeleton';

import { TacheForm } from '../components/TacheForm';
import { useTache } from '../hooks';

/** Modification d'une tâche : même formulaire que la création, prérempli. */
export function ModifierTachePage() {
  const id = Number(useParams().id);
  const { data, error } = useTache(id);

  if (error) {
    return (
      <EtatVide
        icone={ClipboardList}
        titre={error.status === 404 ? 'Tâche introuvable' : 'Tâche indisponible'}
        description={error.message}
      />
    );
  }
  if (!data) return <Skeleton className="h-64" />;
  return <TacheForm key={data.id} mode="modification" tache={data} />;
}
