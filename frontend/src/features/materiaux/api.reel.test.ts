import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';

import * as api from './api';

const serveur = demarrerServeurMsw();

/** Réponse telle que Spring-WS l'écrit (préfixes SOAP-ENV et ns2). */
const soap = (corps: string, status = 200) =>
  new HttpResponse(
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>` +
      corps.replace(/<(\/?)([A-Za-z]+)/g, '<$1ns2:$2') +
      `</SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    { status, headers: { 'Content-Type': 'text/xml' } },
  );
const reponse = (operation: string, contenu: string) =>
  soap(
    `<${operation}Response xmlns:ns2="http://btp.uiz.ma/materiaux">${contenu}</${operation}Response>`,
  );
/** SOAP Fault brute, comme Spring-WS (faultcode avec ou sans préfixe, faultstring avec xml:lang). */
const faute = (faultcode: string, message: string) =>
  new HttpResponse(
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>` +
      `<SOAP-ENV:Fault><faultcode xmlns:m="http://btp.uiz.ma/materiaux">${faultcode}</faultcode>` +
      `<faultstring xml:lang="fr">${message}</faultstring></SOAP-ENV:Fault>` +
      `</SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    { status: 500, headers: { 'Content-Type': 'text/xml' } },
  );
const MATERIAU =
  '<materiau><id>3</id><reference>FER-12</reference><nom>Fer à béton HA12</nom><unite>t</unite>' +
  '<stock>2.4</stock><seuilAlerte>1.0</seuilAlerte><enAlerte>false</enAlerte></materiau>';

/** Capture l'enveloppe envoyée et répond avec la réponse donnée. */
function serveurSoap(repondre: (corps: string) => Response) {
  const corps: string[] = [];
  serveur.use(
    msw.post('*/ws', async ({ request }) => {
      corps.push(await request.text());
      return repondre(corps[corps.length - 1]!);
    }),
  );
  return corps;
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MATERIAUX', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Matériaux en mode réel (SOAP, VITE_API_MATERIAUX=reel)', () => {
  it('ListerMateriaux : lit les matériaux, envoie le filtre d’alerte', async () => {
    const envoyes = serveurSoap(() => reponse('ListerMateriaux', MATERIAU));

    await expect(api.listerMateriaux(true)).resolves.toEqual([
      {
        id: 3,
        reference: 'FER-12',
        nom: 'Fer à béton HA12',
        unite: 't',
        stock: 2.4,
        seuilAlerte: 1,
        enAlerte: false,
      },
    ]);
    expect(envoyes[0]).toContain('<m:enAlerteSeulement>true</m:enAlerteSeulement>');
  });

  it('GetMateriau : Introuvable → 404', async () => {
    serveurSoap(() => faute('m:Introuvable', 'Matériau 99 introuvable'));
    await expect(api.getMateriau(99)).rejects.toMatchObject({
      status: 404,
      message: 'Matériau 99 introuvable',
    });
  });

  it('AjouterMateriau : envoie le matériau dans l’ordre du XSD ; Conflit → 409', async () => {
    const envoyes = serveurSoap(() => reponse('AjouterMateriau', MATERIAU));
    await api.ajouterMateriau({
      reference: 'FER-12',
      nom: 'Fer à béton HA12',
      unite: 't',
      stock: 2.4,
      seuilAlerte: 1,
    });
    expect(envoyes[0]).toContain(
      '<m:materiau><m:reference>FER-12</m:reference><m:nom>Fer à béton HA12</m:nom>' +
        '<m:unite>t</m:unite><m:stock>2.4</m:stock><m:seuilAlerte>1</m:seuilAlerte></m:materiau>',
    );

    const doublon = 'La référence FER-12 est déjà utilisée par un autre matériau';
    serveurSoap(() => faute('m:Conflit', doublon));
    await expect(
      api.ajouterMateriau({
        reference: 'FER-12',
        nom: 'Fer',
        unite: 't',
        stock: 1,
        seuilAlerte: 0,
      }),
    ).rejects.toMatchObject({ status: 409, message: doublon });
  });

  it('VerifierStock et EnregistrerMouvement : résultats lus', async () => {
    const envoyes = serveurSoap((corps) =>
      corps.includes('VerifierStockRequest')
        ? reponse('VerifierStock', '<disponible>false</disponible><stockActuel>2.4</stockActuel>')
        : reponse(
            'EnregistrerMouvement',
            '<mouvementId>12</mouvementId><stockApres>0.4</stockApres><enAlerte>true</enAlerte>',
          ),
    );

    await expect(api.verifierStock(3, 5)).resolves.toEqual({ disponible: false, stockActuel: 2.4 });
    await expect(
      api.enregistrerMouvement({ materiauId: 3, chantierId: 7, type: 'SORTIE', quantite: 2 }),
    ).resolves.toEqual({ mouvementId: 12, stockApres: 0.4, enAlerte: true });
    expect(envoyes[1]).toContain(
      '<m:materiauId>3</m:materiauId><m:chantierId>7</m:chantierId><m:type>SORTIE</m:type>' +
        '<m:quantite>2</m:quantite>',
    );
  });

  it('EnregistrerMouvement : stock insuffisant (Client) → 422, Chantiers injoignable (Server) → 503', async () => {
    const message = 'Stock insuffisant pour FER-12 : disponible 2.4, demandé 5.0';
    serveurSoap(() => faute('SOAP-ENV:Client', message));
    await expect(
      api.enregistrerMouvement({ materiauId: 3, chantierId: 7, type: 'SORTIE', quantite: 5 }),
    ).rejects.toMatchObject({ status: 422, message });

    serveurSoap(() => faute('SOAP-ENV:Server', 'Échec de l’appel au service Chantiers.'));
    await expect(
      api.enregistrerMouvement({ materiauId: 3, chantierId: 7, type: 'SORTIE', quantite: 1 }),
    ).rejects.toMatchObject({ status: 503, message: 'Échec de l’appel au service Chantiers.' });
  });

  it('ListerMouvements : filtres optionnels, mouvements lus (date avec l’heure)', async () => {
    const envoyes = serveurSoap(() =>
      reponse(
        'ListerMouvements',
        '<mouvement><id>2</id><date>2027-03-05T08:00:00Z</date><materiauId>3</materiauId>' +
          '<chantierId>7</chantierId><type>SORTIE</type><quantite>1.5</quantite></mouvement>',
      ),
    );

    await expect(api.listerMouvements({ chantierId: 7 })).resolves.toEqual([
      {
        id: 2,
        date: '2027-03-05T08:00:00Z',
        materiauId: 3,
        chantierId: 7,
        type: 'SORTIE',
        quantite: 1.5,
      },
    ]);
    expect(envoyes[0]).toContain(
      '<m:ListerMouvementsRequest><m:chantierId>7</m:chantierId></m:ListerMouvementsRequest>',
    );

    await api.listerMouvements();
    expect(envoyes[1]).toContain('<m:ListerMouvementsRequest></m:ListerMouvementsRequest>');
  });
});
