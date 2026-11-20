from app import config


def test_database_url_vient_de_l_environnement(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@db:5432/btp_db")
    assert config.database_url() == "postgresql+psycopg://u:p@db:5432/btp_db"


def test_valeur_par_defaut_base_unique(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("OUVRIERS_DB_PASSWORD", raising=False)
    assert config.database_url() == "postgresql+psycopg://ouvriers_user:ouvriers@localhost:5432/btp_db"


def test_mot_de_passe_lu_dans_l_environnement(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("OUVRIERS_DB_PASSWORD", "secret-local")
    assert config.database_url() == "postgresql+psycopg://ouvriers_user:secret-local@localhost:5432/btp_db"


def test_database_url_vide_ignoree(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.delenv("OUVRIERS_DB_PASSWORD", raising=False)
    assert config.database_url().endswith("@localhost:5432/btp_db")
