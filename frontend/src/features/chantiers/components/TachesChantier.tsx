import { Link } from 'react-router-dom';

import type { ApiError } from '@/api/errors';
import { EtatVide } from '@/components/common/EtatVide';
import { Encart } from '@/components/common/Tableau';
import { Button } from '@/components/ui/button';
import { TableauTaches } from '@/features/taches/components/TableauTaches';
import type { Tache } from '@/features/taches/types';

type Props = {
  chantierId: number;
  taches?: Tache[];
  chargement: boolean;
  erreur: ApiError | null;
  lectureSeule: boolean;
};

/** Onglet « Tâches » de la fiche chantier : même tableau que la liste des tâches. */
export function TachesChantier({ chantierId, taches, chargement, erreur, lectureSeule }: Props) {
  if (erreur) {
    return (
      <Encart>
        {erreur.status === 503
          ? 'Liste indisponible pendant la panne du module Tâches.'
          : erreur.message}
      </Encart>
    );
  }

  if (!chargement && taches?.length === 0) {
    return (
      <EtatVide
        titre="Aucune tâche planifiée"
        description="Planifiez la première tâche de ce chantier : le module vérifiera le chantier, les ouvriers et le stock avant de l’enregistrer."
        action={
          !lectureSeule && (
            <Button asChild className="font-bold">
              <Link to={`/chantiers/${chantierId}/taches/nouvelle`} className="no-underline">
                Planifier une tâche
              </Link>
            </Button>
          )
        }
      />
    );
  }

  return <TableauTaches taches={taches} chargement={chargement} lectureSeule={lectureSeule} />;
}
