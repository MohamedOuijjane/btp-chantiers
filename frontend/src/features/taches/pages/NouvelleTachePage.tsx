import { useParams } from 'react-router-dom';

import { TacheForm } from '../components/TacheForm';

/** Création d'une tâche : /taches/nouvelle, ou /chantiers/:id/taches/nouvelle (chantier fixé). */
export function NouvelleTachePage() {
  const { id } = useParams();
  const chantierId = Number(id) || undefined;
  return <TacheForm key={chantierId ?? 'libre'} mode="creation" chantierId={chantierId} />;
}
