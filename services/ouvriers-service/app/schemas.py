from pydantic import BaseModel, ConfigDict, Field

from app.models import Specialite


class OuvrierBase(BaseModel):
    nom: str = Field(min_length=1, max_length=100, examples=["El Amrani"])
    prenom: str = Field(min_length=1, max_length=100, examples=["Youssef"])
    cin: str = Field(pattern=r"^[A-Z]{1,2}\d{3,8}$", examples=["JB123456"], description="CIN marocaine")
    specialite: Specialite
    telephone: str | None = Field(default=None, pattern=r"^(\+212|0)[5-7]\d{8}$", examples=["0612345678"])


class OuvrierCreation(OuvrierBase):
    pass


class OuvrierModification(BaseModel):
    nom: str | None = Field(default=None, min_length=1, max_length=100)
    prenom: str | None = Field(default=None, min_length=1, max_length=100)
    specialite: Specialite | None = None
    telephone: str | None = Field(default=None, pattern=r"^(\+212|0)[5-7]\d{8}$")
    disponible: bool | None = None


class OuvrierReponse(OuvrierBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disponible: bool


class TachePlanning(BaseModel):
    id: str = Field(alias="_id")
    chantierId: int
    titre: str
    dateDebut: str
    dateFin: str
    statut: str


class Planning(BaseModel):
    ouvrier: OuvrierReponse
    taches: list[TachePlanning]
    source_disponible: bool
