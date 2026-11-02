/**
 * Données fictives reprises de la maquette validée (entreprise Souss Bâtiment, Agadir).
 * Elles sont cohérentes entre elles : l'avancement d'un chantier est la moyenne de ses tâches,
 * les ouvriers des tâches existent, les mouvements visent des chantiers et matériaux existants.
 *
 * Indicateurs obtenus (tableau de bord de la maquette) : 3 chantiers en cours sur 6,
 * avancement moyen 46 %, 8 ouvriers disponibles sur 10, 2 matériaux en alerte,
 * budget des chantiers en cours 14 600 000 MAD.
 */
import type { Chantier } from '@/features/chantiers/types';
import type { Materiau, Mouvement } from '@/features/materiaux/types';
import type { Ouvrier } from '@/features/ouvriers/types';
import type { Tache } from '@/features/taches/types';

export const ENTREPRISE = 'Souss Bâtiment';

export type BaseFictive = {
  chantiers: Chantier[];
  taches: Tache[];
  ouvriers: Ouvrier[];
  materiaux: Materiau[];
  mouvements: Mouvement[];
};

const chantiers: Chantier[] = [
  {
    id: 1,
    nom: 'Résidence Al Amal',
    client: 'Copropriété Al Amal',
    adresse: 'Hay Mohammadi, Agadir',
    dateDebut: '2026-09-01',
    dateFinPrevue: '2027-06-30',
    budget: 2_500_000,
    statut: 'EN_COURS',
  },
  {
    id: 2,
    nom: 'Groupe scolaire Anza',
    client: 'Fondation Tazrout',
    adresse: 'Anza, Agadir',
    dateDebut: '2026-10-15',
    dateFinPrevue: '2027-09-15',
    budget: 4_200_000,
    statut: 'EN_COURS',
  },
  {
    id: 3,
    nom: 'Villa Benali',
    client: 'M. Youssef Benali',
    adresse: 'Founty, Agadir',
    dateDebut: '2026-11-02',
    dateFinPrevue: '2027-02-28',
    budget: 1_150_000,
    statut: 'PLANIFIE',
  },
  {
    id: 4,
    nom: 'Clinique Argana · extension',
    client: 'Clinique Argana',
    adresse: 'Talborjt, Agadir',
    dateDebut: '2026-06-01',
    dateFinPrevue: '2026-12-31',
    budget: 3_800_000,
    statut: 'SUSPENDU',
  },
  {
    id: 5,
    nom: 'Entrepôt logistique',
    client: 'Souss Logistique',
    adresse: 'Zone industrielle, Aït Melloul',
    dateDebut: '2026-01-10',
    dateFinPrevue: '2026-09-30',
    budget: 5_600_000,
    statut: 'TERMINE',
  },
  {
    id: 6,
    nom: 'Immeuble Les Dunes',
    client: 'Dunes Promotion',
    adresse: 'Tikiouine, Agadir',
    dateDebut: '2026-10-05',
    dateFinPrevue: '2027-11-30',
    budget: 7_900_000,
    statut: 'EN_COURS',
  },
];

// Identifiants : 1 Youssef, 2 Rachid, 3 Khalid, 4 Lahcen, 5 Saïd, 6 Abdellah, 7 Mustapha,
// 8 Hassan, 9 Brahim, 10 Omar.
const ouvriers: Ouvrier[] = [
  {
    id: 1,
    prenom: 'Youssef',
    nom: 'El Amrani',
    cin: 'JB123456',
    specialite: 'MACON',
    telephone: '0612345678',
    disponible: true,
  },
  {
    id: 2,
    prenom: 'Rachid',
    nom: 'Bouzid',
    cin: 'J457812',
    specialite: 'MACON',
    telephone: '0661224109',
    disponible: true,
  },
  {
    id: 3,
    prenom: 'Khalid',
    nom: 'Ouahbi',
    cin: 'JE998120',
    specialite: 'COFFREUR',
    telephone: '0670183352',
    disponible: true,
  },
  {
    id: 4,
    prenom: 'Lahcen',
    nom: 'Tahiri',
    cin: 'JT556310',
    specialite: 'COFFREUR',
    telephone: '0627816405',
    disponible: true,
  },
  {
    id: 5,
    prenom: 'Saïd',
    nom: 'Moussaoui',
    cin: 'JA301477',
    specialite: 'FERRAILLEUR',
    telephone: '0655901264',
    disponible: true,
  },
  {
    id: 6,
    prenom: 'Abdellah',
    nom: 'Bakri',
    cin: 'JC650233',
    specialite: 'MANOEUVRE',
    telephone: '0701448720',
    disponible: true,
  },
  {
    id: 7,
    prenom: 'Mustapha',
    nom: 'Zaki',
    cin: 'JB772019',
    specialite: 'ELECTRICIEN',
    telephone: '0648276135',
    disponible: true,
  },
  {
    id: 8,
    prenom: 'Hassan',
    nom: 'Aït Lahcen',
    cin: 'JK204588',
    specialite: 'CONDUCTEUR_ENGINS',
    telephone: '0693154026',
    disponible: true,
  },
  {
    id: 9,
    prenom: 'Brahim',
    nom: 'Naciri',
    cin: 'JH118654',
    specialite: 'PLOMBIER',
    telephone: '0632750891',
    disponible: false,
  },
  {
    id: 10,
    prenom: 'Omar',
    nom: 'Fikri',
    cin: 'JD447301',
    specialite: 'PEINTRE',
    telephone: '0766023914',
    disponible: false,
  },
];

const t = (
  id: number,
  chantierId: number,
  titre: string,
  dateDebut: string,
  dateFin: string,
  avancement: number,
  statut: Tache['statut'],
  ouvrierIds: number[],
  motif?: string,
): Tache => ({
  id,
  chantierId,
  titre,
  dateDebut,
  dateFin,
  avancement,
  statut,
  ouvrierIds,
  besoinsMateriaux: [],
  motif: motif ?? null,
});

const taches: Tache[] = [
  t(1, 1, 'Terrassement et fouilles', '2026-09-01', '2026-09-20', 100, 'TERMINEE', [1, 8]),
  t(2, 1, 'Fondations et semelles', '2026-09-21', '2026-10-15', 100, 'TERMINEE', [1, 2, 5]),
  t(3, 1, 'Élévation des murs R+1', '2026-10-16', '2026-11-20', 70, 'EN_COURS', [2, 3]),
  t(4, 1, 'Coulage de la dalle R+1', '2026-11-03', '2026-11-10', 40, 'EN_COURS', [1, 5]),
  t(
    5,
    1,
    'Étanchéité de la toiture',
    '2026-10-27',
    '2026-11-05',
    25,
    'BLOQUEE',
    [6],
    'Livraison de la membrane en retard',
  ),
  t(6, 1, 'Installation électrique', '2026-11-23', '2026-12-18', 0, 'A_FAIRE', [7]),
  t(7, 2, 'Installation de chantier', '2026-10-15', '2026-10-24', 100, 'TERMINEE', [8, 6]),
  t(8, 2, 'Terrassement général', '2026-10-26', '2026-11-15', 40, 'EN_COURS', [8]),
  t(9, 2, 'Fondations', '2026-11-16', '2026-12-10', 0, 'A_FAIRE', [1, 5]),
  t(10, 4, 'Démolition partielle', '2026-06-01', '2026-06-30', 100, 'TERMINEE', [8, 6]),
  t(11, 4, 'Gros œuvre de l’extension', '2026-07-01', '2026-09-30', 41, 'EN_COURS', [2, 3]),
  t(12, 4, 'Réseaux de fluides', '2026-10-01', '2026-11-30', 0, 'A_FAIRE', [9]),
  t(13, 5, 'Charpente métallique', '2026-01-10', '2026-04-30', 100, 'TERMINEE', [5, 3]),
  t(14, 5, 'Dallage industriel', '2026-05-01', '2026-09-30', 100, 'TERMINEE', [1, 6]),
  t(15, 6, 'Terrassement des sous-sols', '2026-10-05', '2026-10-25', 100, 'TERMINEE', [8]),
  t(16, 6, 'Fondations profondes', '2026-10-26', '2026-11-30', 5, 'EN_COURS', [4]),
  t(17, 6, 'Voiles du sous-sol', '2026-12-01', '2027-01-31', 0, 'A_FAIRE', [4, 6]),
];

const materiaux: Materiau[] = [
  {
    id: 1,
    reference: 'MAT-001',
    nom: 'Ciment CPJ 45',
    unite: 'sacs',
    stock: 320,
    seuilAlerte: 400,
    enAlerte: true,
  },
  {
    id: 2,
    reference: 'MAT-002',
    nom: 'Sable de construction',
    unite: 'm³',
    stock: 86,
    seuilAlerte: 30,
    enAlerte: false,
  },
  {
    id: 3,
    reference: 'MAT-003',
    nom: 'Fer à béton HA12',
    unite: 't',
    stock: 2.4,
    seuilAlerte: 3,
    enAlerte: true,
  },
  {
    id: 4,
    reference: 'MAT-004',
    nom: 'Gravette 15/25',
    unite: 'm³',
    stock: 54,
    seuilAlerte: 20,
    enAlerte: false,
  },
  {
    id: 5,
    reference: 'MAT-005',
    nom: 'Brique creuse 8 trous',
    unite: 'unités',
    stock: 12_500,
    seuilAlerte: 4_000,
    enAlerte: false,
  },
  {
    id: 6,
    reference: 'MAT-006',
    nom: 'Membrane d’étanchéité',
    unite: 'rouleaux',
    stock: 18,
    seuilAlerte: 10,
    enAlerte: false,
  },
];

const mouvements: Mouvement[] = [
  { id: 6, date: '2026-10-31', materiauId: 1, chantierId: 1, type: 'SORTIE', quantite: 120 },
  { id: 5, date: '2026-10-30', materiauId: 5, chantierId: 1, type: 'SORTIE', quantite: 2_400 },
  { id: 4, date: '2026-10-29', materiauId: 1, chantierId: 2, type: 'SORTIE', quantite: 80 },
  { id: 3, date: '2026-10-28', materiauId: 3, chantierId: 1, type: 'SORTIE', quantite: 1.8 },
  { id: 2, date: '2026-10-27', materiauId: 1, chantierId: 6, type: 'ENTREE', quantite: 500 },
  { id: 1, date: '2026-10-25', materiauId: 2, chantierId: 1, type: 'SORTIE', quantite: 14 },
];

/** Nouvelle copie des données de départ. */
export function creerDonneesFictives(): BaseFictive {
  return JSON.parse(
    JSON.stringify({ chantiers, taches, ouvriers, materiaux, mouvements }),
  ) as BaseFictive;
}

/** Base fictive en mémoire, partagée par les api.ts des 4 modules (modifiée par les créations). */
export const base: BaseFictive = creerDonneesFictives();

/** Remet la base dans son état initial (tests, rechargement de la démo). */
export function reinitialiserDonneesFictives() {
  Object.assign(base, creerDonneesFictives());
}

/** Prochain identifiant libre d'une collection. */
export function prochainId(liste: { id: number }[]) {
  return liste.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

/** Date du jour au format ISO (aaaa-mm-jj). */
export function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}
