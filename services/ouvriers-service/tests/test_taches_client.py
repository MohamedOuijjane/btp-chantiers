"""Client du module Tâches : réponses normales, 404, erreurs et réponses mal formées."""
import httpx
import pytest

from app import taches_client
from app.taches_client import TachesIndisponible


def repondre(monkeypatch, status=200, json=None, contenu=None, erreur=None):
    def get(url, params=None, timeout=None):
        if erreur:
            raise erreur
        requete = httpx.Request("GET", url)
        if contenu is not None:
            return httpx.Response(status, content=contenu, request=requete)
        return httpx.Response(status, json=json, request=requete)

    monkeypatch.setattr(taches_client.httpx, "get", get)


def test_lister_taches_renvoie_la_liste(monkeypatch):
    repondre(monkeypatch, json=[{"id": 1, "statut": "EN_COURS"}])
    assert taches_client.lister_taches(1) == [{"id": 1, "statut": "EN_COURS"}]


def test_404_vaut_liste_vide(monkeypatch):
    repondre(monkeypatch, status=404, json={"message": "Not Found"})
    assert taches_client.lister_taches(1) == []


@pytest.mark.parametrize(
    ("status", "json", "contenu"),
    [
        (500, {"message": "erreur"}, None),
        (503, {"message": "indisponible"}, None),
        (400, {"message": "requête invalide"}, None),
        (200, None, b"<html>pas du JSON</html>"),
        (200, {"id": 1}, None),
        (200, [1, 2], None),
    ],
    ids=["500", "503", "400", "pas-json", "objet", "liste-sans-objets"],
)
def test_reponse_inexploitable_leve_taches_indisponible(monkeypatch, status, json, contenu):
    repondre(monkeypatch, status=status, json=json, contenu=contenu)
    with pytest.raises(TachesIndisponible):
        taches_client.lister_taches(1)


def test_pas_de_reponse_leve_taches_indisponible(monkeypatch):
    repondre(monkeypatch, erreur=httpx.ConnectError("refusée"))
    with pytest.raises(TachesIndisponible):
        taches_client.lister_taches(1)


def test_taches_non_terminees_filtre_terminee(monkeypatch):
    repondre(monkeypatch, json=[{"id": 1, "statut": "TERMINEE"}, {"id": 2, "statut": "BLOQUEE"}, {"id": 3}])
    assert [t["id"] for t in taches_client.taches_non_terminees(1)] == [2, 3]


def test_planning_degrade_none_si_indisponible(monkeypatch):
    repondre(monkeypatch, erreur=httpx.ReadTimeout("trop long"))
    assert taches_client.taches_de_l_ouvrier(1) is None


def test_planning_404_de_taches_vaut_aucune_tache(monkeypatch):
    repondre(monkeypatch, status=404, json={"message": "Not Found"})
    assert taches_client.taches_de_l_ouvrier(1) == []
