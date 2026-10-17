import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import taches_client
from app.database import Base, get_db
from app.main import app

engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    def _db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


OUVRIER = {"nom": "El Amrani", "prenom": "Youssef", "cin": "JB123456", "specialite": "MACON", "telephone": "0612345678"}


def test_creer_et_consulter(client):
    r = client.post("/api/ouvriers", json=OUVRIER)
    assert r.status_code == 201
    assert r.json()["disponible"] is True
    assert client.get(f"/api/ouvriers/{r.json()['id']}").json()["cin"] == "JB123456"


def test_cin_unique(client):
    client.post("/api/ouvriers", json=OUVRIER)
    assert client.post("/api/ouvriers", json=OUVRIER).status_code == 409


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
    assert body["source_disponible"] is False and body["taches"] == []


def test_planning_depuis_le_module_taches(client, monkeypatch):
    oid = client.post("/api/ouvriers", json=OUVRIER).json()["id"]
    tache = {"_id": "t1", "chantierId": 1, "titre": "Fondations", "dateDebut": "2026-11-02",
             "dateFin": "2026-11-10", "statut": "EN_COURS"}
    monkeypatch.setattr(taches_client, "taches_de_l_ouvrier", lambda _id: [tache])
    assert client.get(f"/api/ouvriers/{oid}/planning").json()["taches"][0]["titre"] == "Fondations"


def test_ouvrier_inexistant(client):
    assert client.get("/api/ouvriers/999").status_code == 404
