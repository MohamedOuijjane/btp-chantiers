import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import taches_client
from app.database import Base, engine, get_db
from app.models import Ouvrier, Specialite
from app.schemas import ErreurChamps, OuvrierCreation, OuvrierModification, OuvrierReponse, Planning

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Ouvriers Service",
    version="0.1.0",
    description="Module Ouvriers - Gestion de chantiers BTP (Équipe 18)",
    docs_url="/swagger-ui",
    lifespan=lifespan,
)


def _trouver(db: Session, ouvrier_id: int) -> Ouvrier:
    ouvrier = db.get(Ouvrier, ouvrier_id)
    if ouvrier is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Ouvrier {ouvrier_id} introuvable")
    return ouvrier


@app.get("/health", tags=["Santé"])
def health():
    return {"status": "UP", "service": "ouvriers-service"}


@app.get("/api/ouvriers", response_model=list[OuvrierReponse], tags=["Ouvriers"])
def lister(
    specialite: Specialite | None = None,
    disponible: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    q = select(Ouvrier).order_by(Ouvrier.nom)
    if specialite:
        q = q.where(Ouvrier.specialite == specialite)
    if disponible is not None:
        q = q.where(Ouvrier.disponible == disponible)
    return db.scalars(q).all()


@app.get("/api/ouvriers/{ouvrier_id}", response_model=OuvrierReponse, tags=["Ouvriers"])
def trouver(ouvrier_id: int, db: Session = Depends(get_db)):
    return _trouver(db, ouvrier_id)


@app.post(
    "/api/ouvriers",
    response_model=OuvrierReponse,
    status_code=201,
    tags=["Ouvriers"],
    responses={409: {"model": ErreurChamps, "description": "CIN déjà utilisée par un autre ouvrier (RG-06)"}},
)
def creer(data: OuvrierCreation, db: Session = Depends(get_db)):
    ouvrier = Ouvrier(**data.model_dump(), disponible=True)
    db.add(ouvrier)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Rattachée au champ cin (#114) : le front l'affiche sous le champ, comme une erreur 422.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            [
                {
                    "loc": ["body", "cin"],
                    "msg": f"La CIN {data.cin} est déjà utilisée par un autre ouvrier",
                    "type": "cin_deja_utilisee",
                }
            ],
        ) from None
    db.refresh(ouvrier)
    return ouvrier


@app.patch("/api/ouvriers/{ouvrier_id}", response_model=OuvrierReponse, tags=["Ouvriers"])
def modifier(ouvrier_id: int, data: OuvrierModification, db: Session = Depends(get_db)):
    ouvrier = _trouver(db, ouvrier_id)
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(ouvrier, champ, valeur)
    db.commit()
    db.refresh(ouvrier)
    return ouvrier


@app.delete(
    "/api/ouvriers/{ouvrier_id}",
    status_code=204,
    tags=["Ouvriers"],
    responses={
        404: {"description": "Ouvrier introuvable"},
        409: {"description": "Ouvrier affecté à au moins une tâche non terminée (A_FAIRE, EN_COURS ou BLOQUEE)"},
        503: {"description": "Module Tâches injoignable : suppression annulée"},
    },
)
def supprimer(ouvrier_id: int, db: Session = Depends(get_db)):
    """Supprime l'ouvrier s'il n'a aucune tâche non terminée dans le module Tâches (#15)."""
    ouvrier = _trouver(db, ouvrier_id)
    try:
        en_cours = taches_client.taches_non_terminees(ouvrier_id)
    except taches_client.TachesIndisponible as e:
        # L'identifiant vient de l'URL : il n'est pas journalisé (injection dans les logs).
        log.warning("Suppression d'un ouvrier annulée, module Tâches indisponible : %s", e)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Le module Tâches ne répond pas : impossible de vérifier les affectations de l'ouvrier, "
            "suppression annulée. Réessayez plus tard.",
        ) from None
    if en_cours:
        titres = ", ".join(f"« {t.get('titre', 'sans titre')} »" for t in en_cours)
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Suppression impossible : {ouvrier.prenom} {ouvrier.nom} est affecté à "
            f"{len(en_cours)} tâche(s) non terminée(s) : {titres}. "
            "Retirez-le de ces tâches ou terminez-les avant de le supprimer.",
        )
    db.delete(ouvrier)
    db.commit()


@app.get("/api/ouvriers/{ouvrier_id}/planning", response_model=Planning, tags=["Ouvriers"])
def planning(ouvrier_id: int, db: Session = Depends(get_db)):
    """Planning de l'ouvrier, construit à partir du module Tâches."""
    ouvrier = _trouver(db, ouvrier_id)
    taches = taches_client.taches_de_l_ouvrier(ouvrier_id)
    return Planning(ouvrier=ouvrier, taches=taches or [], source_disponible=taches is not None)
