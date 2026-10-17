"""Client REST vers le module Tâches (NestJS)."""
import logging

import httpx

from app.config import HTTP_TIMEOUT, TACHES_URL

log = logging.getLogger(__name__)


def taches_de_l_ouvrier(ouvrier_id: int) -> list[dict] | None:
    """Renvoie None si le module Tâches est injoignable (procédure dégradée)."""
    try:
        r = httpx.get(f"{TACHES_URL}/api/taches", params={"ouvrierId": ouvrier_id}, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPError as e:
        log.warning("Module Tâches indisponible : %s", e)
        return None
