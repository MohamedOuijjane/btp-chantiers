import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://btp:btp@localhost:5432/ouvriers_db")
TACHES_URL = os.getenv("TACHES_URL", "http://localhost:8082")
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "2.0"))
