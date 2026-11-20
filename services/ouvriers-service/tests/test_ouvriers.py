from app import taches_client
from tests.conftest import OUVRIER


def test_creer_et_consulter(client):
    r = client.post("/api/ouvriers", json=OUVRIER)
    assert r.status_code == 201
    assert r.json()["disponible"] is True
    assert client.get(f"/api/ouvriers/{r.json()['id']}").json()["cin"] == "JB123456"


def test_cin_unique(client):
    client.post("/api/ouvriers", json=OUVRIER)
    r = client.post("/api/ouvriers", json={**OUVRIER, "nom": "Bennani"})
    assert r.status_code == 409
    assert r.json() == {
        "detail": [
            {
                "loc": ["body", "cin"],
                "msg": "La CIN JB123456 est déjà utilisée par un autre ouvrier",
                "type": "cin_deja_utilisee",
            }
        ]
    }


def test_cin_en_double_sans_detail_technique(client):
    client.post("/api/ouvriers", json=OUVRIER)
    texte = client.post("/api/ouvriers", json=OUVRIER).text.lower()
    for fuite in ("integrity", "unique", "constraint", "sql", "ouvriers.cin"):
        assert fuite not in texte


def test_cin_libre_acceptee_apres_un_autre_ouvrier(client):
    client.post("/api/ouvriers", json=OUVRIER)
    assert client.post("/api/ouvriers", json={**OUVRIER, "cin": "AB1234"}).status_code == 201


def test_cin_en_double_ne_cree_rien(client):
    client.post("/api/ouvriers", json=OUVRIER)
    client.post("/api/ouvriers", json=OUVRIER)
    assert len(client.get("/api/ouvriers").json()) == 1


def test_swagger_documente_le_409_de_creation(client):
    reponses = client.get("/openapi.json").json()["paths"]["/api/ouvriers"]["post"]["responses"]
    assert "409" in reponses and "CIN" in reponses["409"]["description"]


def test_cin_invalide_refusee(client):
    assert client.post("/api/ouvriers", json={**OUVRIER, "cin": "123"}).status_code == 422


def test_filtre_disponibilite(client):
    oid = client.post("/api/ouvriers", json=OUVRIER).json()["id"]
    client.patch(f"/api/ouvriers/{oid}", json={"disponible": False})
    assert client.get("/api/ouvriers", params={"disponible": True}).json() == []


def test_planning_degrade_si_taches_indisponible(client, monkeypatch):
    oid = client.post("/api/ouvriers", json=OUVRIER).json()["id"]
    monkeypatch.setattr(taches_client, "taches_de_l_ouvrier", lambda _id: None)
    body = client.get(f"/api/ouvriers/{oid}/planning").json()
    assert body["sourceDisponible"] is False and body["taches"] == []
    assert "source_disponible" not in body


def test_planning_depuis_le_module_taches(client, monkeypatch):
    oid = client.post("/api/ouvriers", json=OUVRIER).json()["id"]
    tache = {"id": 1, "chantierId": 1, "titre": "Fondations", "dateDebut": "2026-11-02",
             "dateFin": "2026-11-10", "statut": "EN_COURS"}
    monkeypatch.setattr(taches_client, "taches_de_l_ouvrier", lambda _id: [tache])
    body = client.get(f"/api/ouvriers/{oid}/planning").json()
    assert body["taches"][0]["titre"] == "Fondations"
    assert body["sourceDisponible"] is True


def test_planning_ouvrier_inexistant(client):
    assert client.get("/api/ouvriers/999/planning").status_code == 404


def test_swagger_documente_source_disponible_en_camel_case(client):
    schemas = client.get("/openapi.json").json()["components"]["schemas"]
    planning = next(s for nom, s in schemas.items() if nom.startswith("Planning"))
    assert "sourceDisponible" in planning["properties"]
    assert "source_disponible" not in planning["properties"]


def test_ouvrier_inexistant(client):
    assert client.get("/api/ouvriers/999").status_code == 404
