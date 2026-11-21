/**
 * Fixtures partagées des tests de bout en bout :
 * - connecter(page, profil) : connexion par l'écran /connexion, comme un utilisateur ;
 * - api : client REST connecté (JWT) pour préparer les données qu'un parcours ne crée pas
 *   lui-même (une tâche qui bloque une suppression) et pour tout supprimer à la fin du test ;
 * - suffixe : identifiant unique du test, pour que les données ne se mélangent pas.
 */
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export const PROFILS = {
  CONDUCTEUR: { libelle: 'Conducteur de travaux', email: 'samir.haddou@souss-batiment.demo' },
  CHEF_CHANTIER: { libelle: 'Chef de chantier', email: 'karim.aitali@souss-batiment.demo' },
  MAGASINIER: { libelle: 'Magasinier', email: 'fatima.idrissi@souss-batiment.demo' },
} as const;
export type Profil = keyof typeof PROFILS;

export function motDePasse(): string {
  const mdp = process.env.DEMO_MOT_DE_PASSE;
  if (!mdp) throw new Error('DEMO_MOT_DE_PASSE manquant (celui du .env), voir e2e/README.md');
  return mdp;
}

/** Connexion par l'écran : choix du profil, mot de passe, « Se connecter ». */
export async function connecter(page: Page, profil: Profil = 'CONDUCTEUR') {
  await page.goto('/connexion');
  await page.getByText(PROFILS[profil].libelle, { exact: true }).click();
  await page.getByLabel('Mot de passe').fill(motDePasse());
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

/**
 * Référence de matériau propre au test (format ^[A-Z]{2,5}-\d{3}$). Le web service Matériaux
 * n'a pas d'opération de suppression : les matériaux créés par les tests restent en base.
 */
export function referenceUnique() {
  const lettres = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('');
  return `E${lettres}-${Math.floor(100 + Math.random() * 900)}`;
}

/** CIN marocaine valide et propre au test (format ^[A-Z]{1,2}\d{3,8}$). */
export function cinUnique() {
  return `E${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
}

type Chantier = { id: number; nom: string; statut: string };
type Tache = { id: number; titre: string };
/** Élément d'une liste de l'API (chantier ou ouvrier), pour retrouver ce que l'interface a créé. */
type Element = { id: number; nom?: string; cin?: string; titre?: string };

/** Client REST connecté ; garde la trace de ce qu'il crée pour le supprimer à la fin du test. */
export class Api {
  private readonly aSupprimer: string[] = [];
  // Champs déclarés à part (pas de « constructor(private …) ») : Node 22 récent charge les
  // fichiers .ts en retirant seulement les types, et refuse les propriétés de paramètre.
  private readonly http: APIRequestContext;
  private readonly jeton: string;

  constructor(http: APIRequestContext, jeton: string) {
    this.http = http;
    this.jeton = jeton;
  }

  private get entetes() {
    return { Authorization: `Bearer ${this.jeton}` };
  }

  private async creer<T extends { id: number }>(chemin: string, donnees: object): Promise<T> {
    const r = await this.http.post(chemin, { data: donnees, headers: this.entetes });
    expect(r.status(), `POST ${chemin} : ${await r.text()}`).toBe(201);
    const cree = (await r.json()) as T;
    this.aSupprimer.unshift(`${chemin}/${cree.id}`);
    return cree;
  }

  creerChantier(nom: string) {
    return this.creer<Chantier>('/api/chantiers', {
      nom,
      adresse: 'Hay Dakhla, Agadir',
      client: 'Recette E2E',
      dateDebut: '2027-03-01',
      dateFinPrevue: '2027-12-20',
      budget: 1_500_000,
    });
  }

  /** Clôture d'un chantier (statut TERMINE) : plus aucun mouvement de stock accepté. */
  async cloturerChantier(id: number) {
    const r = await this.http.patch(`/api/chantiers/${id}/cloture`, { headers: this.entetes });
    expect(r.status(), `PATCH /api/chantiers/${id}/cloture : ${await r.text()}`).toBe(200);
  }

  creerOuvrier(prenom: string, nom: string, cin: string) {
    return this.creer<{ id: number; cin: string }>('/api/ouvriers', {
      prenom,
      nom,
      cin,
      specialite: 'COFFREUR',
    });
  }

  creerTache(chantierId: number, titre: string, ouvrierIds: number[] = []) {
    return this.creer<Tache>('/api/taches', {
      chantierId,
      titre,
      dateDebut: '2027-03-02',
      dateFin: '2027-03-09',
      ouvrierIds,
    });
  }

  /** Les données créées par l'interface sont retrouvées ici pour être supprimées aussi. */
  async suivre(
    chemin: '/api/chantiers' | '/api/ouvriers' | '/api/taches',
    filtre: (e: Element) => boolean,
  ) {
    const r = await this.http.get(chemin, { headers: this.entetes });
    const liste = (await r.json()) as Element[];
    for (const o of liste.filter(filtre)) this.aSupprimer.push(`${chemin}/${o.id}`);
  }

  async supprimer(chemin: string) {
    const r = await this.http.delete(chemin, { headers: this.entetes });
    const i = this.aSupprimer.indexOf(chemin);
    if (i >= 0 && [204, 404].includes(r.status())) this.aSupprimer.splice(i, 1);
    return r.status();
  }

  /** Tâches d'abord (elles bloquent la suppression des chantiers et des ouvriers), puis le reste. */
  async nettoyer() {
    const ordre = [...this.aSupprimer].sort(
      (a, b) => Number(!a.startsWith('/api/taches')) - Number(!b.startsWith('/api/taches')),
    );
    for (const chemin of ordre) {
      await this.http.delete(chemin, { headers: this.entetes }).catch(() => undefined);
    }
  }
}

export const test = base.extend<{ api: Api; suffixe: string }>({
  suffixe: async ({}, use, info) => {
    await use(`${Date.now().toString(36)}${info.workerIndex}`.toUpperCase());
  },
  api: async ({ request }, use) => {
    const r = await request.post('/api/auth/login', {
      data: { email: PROFILS.CONDUCTEUR.email, motDePasse: motDePasse() },
    });
    expect(r.status(), 'connexion de l’API de test').toBe(200);
    const api = new Api(request, ((await r.json()) as { token: string }).token);
    await use(api);
    await api.nettoyer();
  },
});

export { expect };
