// Types du module Matériaux (SOAP, Spring-WS), alignés sur contracts/materiaux.xsd
// et sur l'opération cible ListerMouvements (#18).

/** Élément `Materiau` du XSD. */
export type Materiau = {
  id: number;
  reference: string;
  nom: string;
  unite: string;
  stock: number;
  seuilAlerte: number;
  /** stock ≤ seuilAlerte (RG-08). */
  enAlerte: boolean;
};

/** Entrée de AjouterMateriau. */
export type MateriauCreation = Omit<Materiau, 'id' | 'enAlerte'>;

export type TypeMouvement = 'ENTREE' | 'SORTIE';

/** Mouvement de stock, tel que renvoyé par ListerMouvements. */
export type Mouvement = {
  id: number;
  /** Date ISO aaaa-mm-jj. */
  date: string;
  materiauId: number;
  chantierId: number;
  type: TypeMouvement;
  quantite: number;
};

/** Entrée de EnregistrerMouvement. */
export type MouvementCreation = Omit<Mouvement, 'id' | 'date'>;

/** Sortie de EnregistrerMouvement. */
export type ResultatMouvement = { mouvementId: number; stockApres: number; enAlerte: boolean };

/** Sortie de VerifierStock. */
export type VerificationStock = { disponible: boolean; stockActuel: number };

export type FiltreMouvements = { chantierId?: number; materiauId?: number };
