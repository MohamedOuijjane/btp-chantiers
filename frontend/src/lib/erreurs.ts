import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';

/** Titre court d'une erreur selon son code HTTP. */
export function titreErreur(e: Pick<ApiError, 'status'>) {
  switch (e.status) {
    case 0:
      return 'Réseau indisponible';
    case 400:
      return 'Données invalides';
    case 404:
      return 'Introuvable';
    case 409:
      return 'Conflit';
    case 422:
      return 'Demande refusée';
    case 503:
      return 'Module indisponible';
    default:
      return 'Erreur inattendue';
  }
}

/** Toast d'erreur (sonner l'annonce aux lecteurs d'écran via une région aria-live). */
export function notifierErreur(e: ApiError) {
  toast.error(titreErreur(e), { description: e.message });
}
