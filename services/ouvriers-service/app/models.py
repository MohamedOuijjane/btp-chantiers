import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Specialite(str, enum.Enum):
    MACON = "MACON"
    FERRAILLEUR = "FERRAILLEUR"
    COFFREUR = "COFFREUR"
    ELECTRICIEN = "ELECTRICIEN"
    PLOMBIER = "PLOMBIER"
    PEINTRE = "PEINTRE"
    CONDUCTEUR_ENGINS = "CONDUCTEUR_ENGINS"
    MANOEUVRE = "MANOEUVRE"


class Ouvrier(Base):
    __tablename__ = "ouvriers"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(100))
    prenom: Mapped[str] = mapped_column(String(100))
    cin: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    specialite: Mapped[Specialite] = mapped_column(Enum(Specialite, native_enum=False, length=30))
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True)
