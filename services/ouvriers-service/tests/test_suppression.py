"""#15 : DELETE /api/ouvriers/{id} vérifie les tâches de l'ouvrier dans le module Tâches."""
import httpx
import pytest

from app import taches_client
from tests.conftest import OUVRIER

URL_TACHES = f"{taches_client.TACHES_URL}/api/taches"


def tache(titre: str, statut: str) -> dict:
    return {"id": 1, "chantierId": 1, "titre": titre, "dateDebut": "2026-11-02", "dateFin": "2026-11-10",
            "statut": statut, "ouvrierIds": [1]}


@pytest.fixture()
def taches(monkeypatch):
    """Simule GET /api/taches?ouvrierId= : appels enregistrés, réponse ou exception configurables."""

    class Faux:
        appels: list[dict] = []
        status = 200
        corps: object = []
        erreur: Exception | None = None

        def get(self, url, params=None, timeout=None):
            self.appels.append({"url": url, "params": params})
            if self.erreur:
                raise self.erreur
            return httpx.Response(self.status, json=self.corps, request=httpx.Request("GET", url))

    faux = Faux()
    faux.appels = []
    monkeypatch.setattr(taches_client.httpx, "get", faux.get)
    return faux


@pytest.fixture()
def oid(client):
    return client.post("/api/ouvriers", json=OUVRIER).json()["id"]


def existe(client, oid) -> bool:
    return client.get(f"/api/ouvriers/{oid}").status_code == 200


# ---------- Suppression autorisée ----------

def test_sans_tache_supprime(client, taches, oid):
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 204
    assert not existe(client, oid)
    assert taches.appels == [{"url": URL_TACHES, "params": {"ouvrierId": oid}}]


def test_toutes_les_taches_terminees_supprime(client, taches, oid):
    taches.corps = [tache("Fondations", "TERMINEE"), tache("Coffrage", "TERMINEE")]
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 204
    assert not existe(client, oid)


def test_404_de_taches_vaut_aucune_tache(client, taches, oid):
    taches.status, taches.corps = 404, {"message": "Not Found"}
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 204
    assert not existe(client, oid)


# ---------- Suppression refusée : 409 ----------

@pytest.mark.parametrize("statut", ["A_FAIRE", "EN_COURS", "BLOQUEE"])
def test_tache_non_terminee_refuse(client, taches, oid, statut):
    taches.corps = [tache("Fondations", statut)]
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 409
    assert "Youssef El Amrani" in r.json()["detail"]
    assert "« Fondations »" in r.json()["detail"]
    assert existe(client, oid)


def test_409_ne_cite_que_les_taches_non_terminees(client, taches, oid):
    taches.corps = [tache("Fondations", "TERMINEE"), tache("Coffrage", "EN_COURS"), tache("Ferraillage", "A_FAIRE")]
    detail = client.delete(f"/api/ouvriers/{oid}").json()["detail"]
    assert "2 tâche(s) non terminée(s)" in detail
    assert "« Coffrage »" in detail and "« Ferraillage »" in detail
    assert "Fondations" not in detail


def test_tache_sans_statut_comptee_non_terminee(client, taches, oid):
    taches.corps = [{"id": 3, "titre": "Inconnue"}]
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 409
    assert existe(client, oid)


# ---------- Tâches indisponible : 503, rien n'est supprimé ----------

@pytest.mark.parametrize(
    "erreur",
    [httpx.ConnectError("connexion refusée"), httpx.ReadTimeout("trop long")],
    ids=["injoignable", "delai-depasse"],
)
def test_taches_sans_reponse_503(client, taches, oid, erreur):
    taches.erreur = erreur
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 503
    assert "Tâches ne répond pas" in r.json()["detail"]
    assert existe(client, oid)


@pytest.mark.parametrize("code", [500, 502, 503])
def test_taches_en_erreur_5xx_503(client, taches, oid, code):
    taches.status, taches.corps = code, {"message": "erreur"}
    r = client.delete(f"/api/ouvriers/{oid}")
    assert r.status_code == 503
    assert existe(client, oid)


def test_503_sans_detail_technique(client, taches, oid):
    taches.erreur = httpx.ConnectError("[Errno 111] Connection refused")
    detail = client.delete(f"/api/ouvriers/{oid}").json()["detail"]
    assert "Errno" not in detail and "taches-service" not in detail


# ---------- Cas limites ----------

def test_ouvrier_inexistant_404_sans_appeler_taches(client, taches):
    r = client.delete("/api/ouvriers/999")
    assert r.status_code == 404
    assert taches.appels == []


def test_swagger_documente_409_et_503(client):
    reponses = client.get("/openapi.json").json()["paths"]["/api/ouvriers/{ouvrier_id}"]["delete"]["responses"]
    assert {"204", "404", "409", "503"} <= reponses.keys()
