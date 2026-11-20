"""Client REST vers le module Tâches (NestJS) : GET /api/taches?ouvrierId=."""
import logging

import httpx

from app.config import HTTP_TIMEOUT, TACHES_URL

log = logging.getLogger(__name__)

STATUT_TERMINEE = "TERMINEE"


class TachesIndisponible(Exception):
    """Tâches n'a pas répondu, ou a répondu en erreur : impossible de connaître les affectations."""


def lister_taches(ouvrier_id: int) -> list[dict]:
    """Tâches de l'ouvrier. Un 404 de Tâches vaut « aucune tâche ».

    Lève TachesIndisponible si Tâches ne répond pas, répond en erreur ou renvoie autre chose qu'une liste.
    """
    try:
        r = httpx.get(f"{TACHES_URL}/api/taches", params={"ouvrierId": ouvrier_id}, timeout=HTTP_TIMEOUT)
    except httpx.HTTPError as e:
        raise TachesIndisponible(f"pas de réponse ({e.__class__.__name__})") from e
    if r.status_code == httpx.codes.NOT_FOUND:
        return []
    if r.is_error:
        raise TachesIndisponible(f"réponse HTTP {r.status_code}")
    try:
        taches = r.json()
    except ValueError as e:
        raise TachesIndisponible("réponse illisible") from e
    if not isinstance(taches, list) or not all(isinstance(t, dict) for t in taches):
        raise TachesIndisponible("réponse inattendue")
    return taches


def taches_de_l_ouvrier(ouvrier_id: int) -> list[dict] | None:
    """Pour le planning : None si Tâches est indisponible (procédure dégradée)."""
    try:
        return lister_taches(ouvrier_id)
    except TachesIndisponible as e:
        log.warning("Module Tâches indisponible : %s", e)
        return None


def taches_non_terminees(ouvrier_id: int) -> list[dict]:
    """Pour la suppression (#15) : tâches A_FAIRE, EN_COURS ou BLOQUEE de l'ouvrier.

    Une tâche sans statut est comptée comme non terminée. Lève TachesIndisponible.
    """
    return [t for t in lister_taches(ouvrier_id) if t.get("statut") != STATUT_TERMINEE]
