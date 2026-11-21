import os


def _url_base_par_defaut() -> str:
    """Base unique btp_db (ADR-0005) : utilisateur ouvriers_user, limité au schéma ouvriers.

    Le mot de passe vient de OUVRIERS_DB_PASSWORD ; « ouvriers » n'est que la valeur de
    développement publique, la même que dans .env.example et docker-compose.yml.
    """
    mot_de_passe = os.getenv("OUVRIERS_DB_PASSWORD", "ouvriers")
    return f"postgresql+psycopg://ouvriers_user:{mot_de_passe}@localhost:5432/btp_db"


def database_url() -> str:
    """DATABASE_URL reste la source principale (docker-compose, CI, tests)."""
    return os.getenv("DATABASE_URL") or _url_base_par_defaut()


DATABASE_URL = database_url()
TACHES_URL = os.getenv("TACHES_URL", "http://localhost:8082")
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "2.0"))
