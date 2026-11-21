/**
 * Tableau de bord sur les API réelles des quatre modules (VITE_API_*=reel), servies par MSW :
 * indicateurs calculés à partir des vraies réponses, et une erreur par module (503 ou autre code)
 * qui n'efface que les cartes de ce module, sans jamais afficher des zéros trompeurs.
 */
import { screen, within } from '@testing-library/react';
import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

const serveur = demarrerServeurMsw();

const chantier = (id: number, nom: string, statut: string) => ({
  id,
  nom,
  adresse: 'Agadir',
  client: 'Client',
  dateDebut: '2026-09-01',
  dateFinPrevue: '2027-06-30',
  budget: 1_000_000,
  statut,
});
const tache = (id: number, titre: string, statut: string, dateFin: string) => ({
  id,
  chantierId: 1,
  titre,
  dateDebut: '2026-09-01',
  dateFin,
  statut,
  avancement: statut === 'EN_COURS' ? 40 : 0,
  ouvrierIds: [],
  besoinsMateriaux: [],
  motif: null,
});
const ouvrier = (id: number, prenom: string, disponible: boolean) => ({
  id,
  prenom,
  nom: 'Test',
  cin: `AB${id}000`,
  specialite: 'MACON',
  telephone: null,
  disponible,
});
const soap = (operation: string, contenu: string) =>
  new HttpResponse(
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>` +
      `<ns2:${operation}Response xmlns:ns2="http://btp.uiz.ma/materiaux">` +
      contenu.replace(/<(\/?)([A-Za-z]+)/g, '<$1ns2:$2') +
      `</ns2:${operation}Response></SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    { headers: { 'Content-Type': 'text/xml' } },
  );

/** Les quatre modules répondent ; `surcharges` remplace certaines routes. */
function api(surcharges: Parameters<typeof serveur.use> = []) {
  serveur.use(
    ...surcharges,
    msw.get('*/api/chantiers', () =>
      HttpResponse.json([
        chantier(1, 'Résidence Atlas', 'EN_COURS'),
        chantier(2, 'Villa Anza', 'PLANIFIE'),
      ]),
    ),
    msw.get('*/api/chantiers/1/avancement', () =>
      HttpResponse.json({
        chantierId: 1,
        nombreTaches: 2,
        avancementGlobal: 40,
        sourceDisponible: true,
      }),
    ),
    msw.get('*/api/taches/historique', () =>
      HttpResponse.json([{ tacheId: 11, statut: 'EN_COURS', date: '2026-11-20T09:00:00.000Z' }]),
    ),
    msw.get('*/api/taches', () =>
      HttpResponse.json([
        tache(10, 'Coulage dalle', 'A_FAIRE', '2026-10-01'),
        tache(11, 'Coffrage poteaux', 'EN_COURS', '2027-01-15'),
      ]),
    ),
    msw.get('*/api/ouvriers', () =>
      HttpResponse.json([ouvrier(1, 'Rachid', true), ouvrier(2, 'Youssef', false)]),
    ),
    msw.post('*/ws', async ({ request }) => {
      const corps = await request.text();
      if (corps.includes('ListerMouvementsRequest')) {
        return soap(
          'ListerMouvements',
          '<mouvement><id>5</id><date>2026-11-19T08:00:00Z</date><materiauId>3</materiauId>' +
            '<chantierId>99</chantierId><type>SORTIE</type><quantite>12</quantite></mouvement>',
        );
      }
      return soap(
        'ListerMateriaux',
        '<materiau><id>3</id><reference>CIM-045</reference><nom>Ciment CPJ 45</nom>' +
          '<unite>sacs</unite><stock>70</stock><seuilAlerte>100</seuilAlerte>' +
          '<enAlerte>true</enAlerte></materiau>',
      );
    }),
  );
}

const carte = (titre: string) => screen.getByText(titre, { selector: 'span' }).closest('a')!;

beforeEach(() => {
  for (const m of ['CHANTIERS', 'TACHES', 'OUVRIERS', 'MATERIAUX'])
    vi.stubEnv(`VITE_API_${m}`, 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Tableau de bord sur les API réelles', () => {
  it('indicateurs, avancement, alertes et activités lus dans les quatre modules', async () => {
    api();
    afficherApp('/');

    expect(await screen.findByText('Ciment CPJ 45', { selector: 'strong' })).toBeInTheDocument();
    expect(await within(carte('Chantiers en cours')).findByText('1')).toBeInTheDocument();
    expect(carte('Tâches en retard')).toHaveTextContent('Fin dépassée : Coulage dalle');
    expect(carte('Ouvriers disponibles')).toHaveTextContent('Indisponibles : Youssef Test');
    expect(carte('Matériaux en alerte')).toHaveTextContent('1');
    expect(await screen.findByText('Avancement moyen :')).toHaveTextContent('40 %');

    const activites = await screen.findByRole('list', { name: 'Dernières activités' });
    expect(
      await within(activites).findByRole('link', { name: 'Coffrage poteaux' }),
    ).toBeInTheDocument();
    // Mouvement d'un chantier supprimé depuis : son numéro, pas un nom vide.
    expect(within(activites).getByText('· Chantier 99')).toBeInTheDocument();
  });

  it('erreur 500 du module Ouvriers : bandeau rouge et carte en erreur, pas de zéro', async () => {
    api([
      msw.get('*/api/ouvriers', () =>
        HttpResponse.json(
          { detail: 'Erreur interne' },
          { status: 500, headers: { 'X-Request-Id': 'req-500' } },
        ),
      ),
    ]);
    afficherApp('/');

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent('Module Ouvriers : Erreur interne');
    expect(alerte).toHaveTextContent('req-500');
    expect(carte('Ouvriers disponibles')).toHaveTextContent('Erreur du module Ouvriers');
    expect(carte('Ouvriers disponibles')).not.toHaveTextContent('Toute l’équipe est disponible');
    expect(screen.queryByText(/Mode dégradé/)).not.toBeInTheDocument();
    // Les autres modules restent affichés.
    expect(await within(carte('Chantiers en cours')).findByText('1')).toBeInTheDocument();
  });

  it('erreur 500 du module Tâches : cartes et sections Tâches en erreur, le reste affiché', async () => {
    const erreur = () =>
      HttpResponse.json({ statusCode: 500, message: 'Erreur interne' }, { status: 500 });
    api([msw.get('*/api/taches', erreur), msw.get('*/api/taches/historique', erreur)]);
    afficherApp('/');

    expect(
      await screen.findByText('Liste non disponible : erreur 500 du module Tâches.'),
    ).toBeInTheDocument();
    expect(carte('Tâches en retard')).toHaveTextContent('Erreur du module Tâches');
    expect(
      screen.getByText(/Avancement non disponible : erreur 500 du module Tâches\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Changements de statut des tâches indisponibles (module Tâches).'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ciment CPJ 45', { selector: 'strong' })).toBeInTheDocument();
  });

  it('historique global seul en erreur : les tâches restent affichées, les activités le signalent', async () => {
    api([msw.get('*/api/taches/historique', () => new HttpResponse(null, { status: 502 }))]);
    afficherApp('/');

    expect(
      await screen.findByText('Changements de statut des tâches indisponibles (module Tâches).'),
    ).toBeInTheDocument();
    expect(carte('Tâches en retard')).toHaveTextContent('Coulage dalle');
  });

  it('base vide : aucun ouvrier enregistré, aucune activité', async () => {
    api([
      msw.get('*/api/ouvriers', () => HttpResponse.json([])),
      msw.get('*/api/taches/historique', () => HttpResponse.json([])),
      msw.post('*/ws', async ({ request }) =>
        soap(/<m:(\w+)Request/.exec(await request.text())?.[1] ?? '', ''),
      ),
    ]);
    afficherApp('/');

    expect(
      await within(carte('Ouvriers disponibles')).findByText('Aucun ouvrier enregistré'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Aucune activité récente.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
