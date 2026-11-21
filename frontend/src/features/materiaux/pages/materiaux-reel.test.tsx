/**
 * Pages branchées sur le web service SOAP Matériaux réel (VITE_API_MATERIAUX=reel), servi par MSW.
 * Les autres modules restent en données fictives (chantier 1 « Résidence Al Amal »…).
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

const serveur = demarrerServeurMsw();

const enveloppe = (corps: string, status = 200) =>
  new HttpResponse(
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>` +
      `${corps}</SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    { status, headers: { 'Content-Type': 'text/xml' } },
  );
const reponse = (operation: string, contenu = '') =>
  enveloppe(
    `<ns2:${operation}Response xmlns:ns2="http://btp.uiz.ma/materiaux">` +
      contenu.replace(/<(\/?)([A-Za-z]+)/g, '<$1ns2:$2') +
      `</ns2:${operation}Response>`,
  );
const faute = (code: string, message: string) =>
  enveloppe(
    `<SOAP-ENV:Fault><faultcode xmlns:m="http://btp.uiz.ma/materiaux">${code}</faultcode>` +
      `<faultstring xml:lang="fr">${message}</faultstring></SOAP-ENV:Fault>`,
    500,
  );

const materiau = (id: number, reference: string, nom: string, stock: number, seuil: number) =>
  `<materiau><id>${id}</id><reference>${reference}</reference><nom>${nom}</nom><unite>t</unite>` +
  `<stock>${stock}</stock><seuilAlerte>${seuil}</seuilAlerte><enAlerte>${stock <= seuil}</enAlerte></materiau>`;
const MATERIAUX =
  materiau(3, 'FER-12', 'Fer à béton HA12', 2.4, 1) + materiau(4, 'SAB-01', 'Sable fin', 0.5, 2);
const MOUVEMENTS =
  '<mouvement><id>8</id><date>2027-03-05T08:00:00Z</date><materiauId>3</materiauId>' +
  '<chantierId>1</chantierId><type>SORTIE</type><quantite>1.5</quantite></mouvement>' +
  '<mouvement><id>7</id><date>2027-03-02T09:30:00Z</date><materiauId>4</materiauId>' +
  '<chantierId>2</chantierId><type>ENTREE</type><quantite>3</quantite></mouvement>';

/** Web service simulé : chaque opération répond selon `surcharges`, sinon avec les données ci-dessus. */
function serviceMateriaux(surcharges: Record<string, (corps: string) => Response> = {}) {
  const recus: string[] = [];
  serveur.use(
    msw.post('*/ws', async ({ request }) => {
      const corps = await request.text();
      recus.push(corps);
      const operation = /<m:(\w+)Request/.exec(corps)?.[1] ?? '';
      const surcharge = surcharges[operation];
      if (surcharge) return surcharge(corps);
      if (operation === 'ListerMateriaux') return reponse(operation, MATERIAUX);
      if (operation === 'ListerMouvements') {
        const filtreChantier = /<m:chantierId>1</.test(corps);
        return reponse(
          operation,
          filtreChantier ? MOUVEMENTS.split('</mouvement>')[0] + '</mouvement>' : MOUVEMENTS,
        );
      }
      return faute('SOAP-ENV:Server', `Opération ${operation} non simulée`);
    }),
  );
  return recus;
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MATERIAUX', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Matériaux sur le web service SOAP réel', () => {
  it('page Matériaux : stock (ListerMateriaux), derniers mouvements et consommation (ListerMouvements)', async () => {
    serviceMateriaux();
    afficherApp('/materiaux');

    const fer = (await screen.findByText('FER-12')).closest('tr')!;
    expect(within(fer).getByText('Suffisant')).toBeInTheDocument();
    expect(
      within(screen.getByText('SAB-01').closest('tr')!).getByText('En alerte'),
    ).toBeInTheDocument();

    const recents = await screen.findByRole('table', { name: 'Derniers mouvements' });
    const lignes = within(recents).getAllByRole('row');
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toHaveTextContent('05/03');
    expect(lignes[0]).toHaveTextContent('Fer à béton HA12');
    expect(screen.queryByText(/non disponible/i)).not.toBeInTheDocument();

    const conso = screen.getByRole('table', { name: 'Consommation par chantier' });
    expect(within(conso).getByText(/Résidence Al Amal/)).toBeInTheDocument();
  });

  it('sortie refusée par le service (Client → 422) : message affiché dans le dialogue', async () => {
    const message = 'Le chantier 1 est terminé : aucun mouvement de stock possible';
    serviceMateriaux({ EnregistrerMouvement: () => faute('SOAP-ENV:Client', message) });
    afficherApp('/materiaux');
    await screen.findByText('FER-12');

    await userEvent.click(screen.getByRole('button', { name: 'Entrée / sortie de stock' }));
    const d = screen.getByRole('dialog', { name: 'Mouvement de stock' });
    await userEvent.click(within(d).getByRole('radio', { name: 'Sortie' }));
    await userEvent.selectOptions(
      within(d).getByLabelText('Matériau'),
      within(d).getByRole('option', { name: /Fer à béton HA12/ }),
    );
    await userEvent.selectOptions(
      within(d).getByLabelText('Chantier'),
      within(d).getByRole('option', { name: /Résidence Al Amal/ }),
    );
    await userEvent.type(within(d).getByLabelText(/^Quantité/), '1');
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));

    expect(await within(d).findByText(message)).toBeInTheDocument();
  });

  it('référence déjà utilisée (Conflit → 409) : message affiché dans le dialogue', async () => {
    const message = 'La référence MAT-003 est déjà utilisée par un autre matériau';
    const recus = serviceMateriaux({ AjouterMateriau: () => faute('m:Conflit', message) });
    afficherApp('/materiaux');
    await screen.findByText('FER-12');

    await userEvent.click(screen.getByRole('button', { name: 'Nouveau matériau' }));
    const d = screen.getByRole('dialog', { name: 'Nouveau matériau' });
    await userEvent.type(within(d).getByLabelText(/^Référence/), 'MAT-003');
    await userEvent.type(within(d).getByLabelText(/^Nom/), 'Fer');
    await userEvent.type(within(d).getByLabelText(/^Unité/), 't');
    await userEvent.type(within(d).getByLabelText(/^Stock initial/), '1');
    await userEvent.type(within(d).getByLabelText(/^Seuil/), '0');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter le matériau' }));

    expect(await within(d).findByText(message)).toBeInTheDocument();
    expect(recus.some((c) => c.includes('<m:AjouterMateriauRequest><m:materiau>'))).toBe(true);
  });

  it('fiche chantier : onglet « Matériaux consommés » filtré par chantier', async () => {
    const recus = serviceMateriaux();
    afficherApp('/chantiers/1');

    const onglet = await screen.findByRole('tab', { name: 'Matériaux consommés · 1' });
    await userEvent.click(onglet);
    const tableau = await screen.findByRole('tabpanel');
    expect(within(tableau).getByText('Fer à béton HA12')).toBeInTheDocument();
    expect(within(tableau).getByText('05/03')).toBeInTheDocument();
    expect(recus).toContainEqual(
      expect.stringContaining(
        '<m:ListerMouvementsRequest><m:chantierId>1</m:chantierId></m:ListerMouvementsRequest>',
      ),
    );
  });

  it('module Matériaux arrêté (502 de la gateway) : encart sur le tableau de bord', async () => {
    serveur.use(msw.post('*/ws', () => new HttpResponse('Bad Gateway', { status: 502 })));
    afficherApp('/');

    expect(
      await screen.findByText('Mouvements de stock indisponibles (module Matériaux).'),
    ).toBeInTheDocument();
  });
});
