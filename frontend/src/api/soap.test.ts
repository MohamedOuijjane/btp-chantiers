import { http as msw, HttpResponse } from 'msw';

import { sessionDemo } from '@/features/auth/api';
import { effacerSession, ecrireSession, surSessionExpiree } from '@/features/auth/session';
import { demarrerServeurMsw } from '@/test/msw';

import { ErreurApi } from './errors';
import { appelSoap, echapperXml, enfants, enveloppe, texte } from './soap';

const serveur = demarrerServeurMsw();
const NS = 'http://btp.uiz.ma/materiaux';

/** Réponse telle que Spring-WS l'écrit : préfixes SOAP-ENV et ns2. */
const reponseSoap = (corps: string, status = 200) =>
  new HttpResponse(
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header/>` +
      `<SOAP-ENV:Body>${corps}</SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    { status, headers: { 'Content-Type': 'text/xml;charset=utf-8', 'X-Request-Id': 'req-soap-1' } },
  );

const faute = (code: string, message: string, attributs = '') =>
  reponseSoap(
    `<SOAP-ENV:Fault><faultcode${attributs}>${code}</faultcode>` +
      `<faultstring xml:lang="fr">${message}</faultstring></SOAP-ENV:Fault>`,
    500,
  );

afterEach(() => {
  effacerSession();
});

describe('enveloppe SOAP', () => {
  it('garde l’ordre des éléments, imbrique les objets, ignore les valeurs absentes', () => {
    expect(
      enveloppe(NS, 'AjouterMateriau', {
        materiau: { reference: 'FER-12', nom: 'Fer', stock: 2.4, seuilAlerte: undefined },
      }),
    ).toContain(
      '<m:AjouterMateriauRequest><m:materiau><m:reference>FER-12</m:reference><m:nom>Fer</m:nom>' +
        '<m:stock>2.4</m:stock></m:materiau></m:AjouterMateriauRequest>',
    );
  });

  it('échappe les caractères spéciaux du XML', () => {
    expect(echapperXml(`Ciment <CPJ> & "sable" l'été`)).toBe(
      'Ciment &lt;CPJ&gt; &amp; &quot;sable&quot; l&apos;été',
    );
  });
});

describe('appelSoap', () => {
  it('POST /ws avec jeton, X-Request-Id et Content-Type ; réponse lue sans tenir compte des préfixes', async () => {
    ecrireSession({ ...sessionDemo('CONDUCTEUR'), jeton: 'jeton.test' });
    let entetes: Headers | undefined;
    let corps = '';
    serveur.use(
      msw.post('*/ws', async ({ request }) => {
        entetes = request.headers;
        corps = await request.text();
        return reponseSoap(
          '<ns2:VerifierStockResponse xmlns:ns2="http://btp.uiz.ma/materiaux">' +
            '<ns2:disponible>true</ns2:disponible><ns2:stockActuel>12.5</ns2:stockActuel>' +
            '</ns2:VerifierStockResponse>',
        );
      }),
    );

    const r = await appelSoap('Matériaux', NS, 'VerifierStock', { materiauId: 1, quantite: 3 });

    expect(r.localName).toBe('VerifierStockResponse');
    expect(texte(r, 'disponible')).toBe('true');
    expect(texte(r, 'stockActuel')).toBe('12.5');
    expect(entetes?.get('Authorization')).toBe('Bearer jeton.test');
    expect(entetes?.get('Content-Type')).toBe('text/xml; charset=utf-8');
    expect(entetes?.get('X-Request-Id')).toMatch(/^[0-9a-f]{32}$/);
    expect(corps).toContain(
      '<m:VerifierStockRequest><m:materiauId>1</m:materiauId><m:quantite>3</m:quantite>',
    );
  });

  it('liste : enfants() renvoie tous les éléments de même nom local', async () => {
    serveur.use(
      msw.post('*/ws', () =>
        reponseSoap(
          '<ns2:ListerMateriauxResponse xmlns:ns2="http://btp.uiz.ma/materiaux">' +
            '<ns2:materiau><ns2:id>1</ns2:id></ns2:materiau><ns2:materiau><ns2:id>2</ns2:id></ns2:materiau>' +
            '</ns2:ListerMateriauxResponse>',
        ),
      ),
    );
    const r = await appelSoap('Matériaux', NS, 'ListerMateriaux');
    expect(enfants(r, 'materiau').map((m) => texte(m, 'id'))).toEqual(['1', '2']);
  });

  it.each([
    ['m:Introuvable', ' xmlns:m="http://btp.uiz.ma/materiaux"', 404, 'Matériau 99 introuvable'],
    [
      'ns3:Conflit',
      ' xmlns:ns3="http://btp.uiz.ma/materiaux"',
      409,
      'La référence FER-12 est déjà utilisée',
    ],
    ['SOAP-ENV:Client', '', 422, 'Stock insuffisant pour FER-12 : disponible 2.4, demandé 5.0'],
    ['Client', '', 422, 'Le chantier 7 est terminé'],
    ['SOAP-ENV:Server', '', 503, 'Échec de l’appel au service Chantiers.'],
    ['m:Inconnu', ' xmlns:m="urn:autre"', 503, 'Erreur inattendue'],
  ])('faute %s → %i, message = faultstring', async (code, attributs, status, message) => {
    serveur.use(msw.post('*/ws', () => faute(code, message, attributs)));

    const e = await appelSoap('Matériaux', NS, 'GetMateriau', { id: 99 }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurApi);
    expect(e).toMatchObject({ status, message, requestId: 'req-soap-1' });
  });

  it('502 de la gateway (Matériaux arrêté) : 503 « module indisponible »', async () => {
    serveur.use(
      msw.post('*/ws', () => new HttpResponse('<html>Bad Gateway</html>', { status: 502 })),
    );
    await expect(appelSoap('Matériaux', NS, 'ListerMateriaux')).rejects.toMatchObject({
      status: 503,
      message: 'Le module Matériaux est indisponible, réessayez dans un instant.',
    });
  });

  it('401 de la gateway avec un jeton : session expirée signalée', async () => {
    ecrireSession({ ...sessionDemo('CONDUCTEUR'), jeton: 'jeton.expire' });
    const expiree = vi.fn();
    const arreter = surSessionExpiree(expiree);
    serveur.use(
      msw.post('*/ws', () =>
        HttpResponse.json(
          { status: 401, detail: 'Authentification requise : jeton absent, invalide ou expiré.' },
          { status: 401 },
        ),
      ),
    );

    await expect(appelSoap('Matériaux', NS, 'ListerMateriaux')).rejects.toMatchObject({
      status: 401,
    });
    expect(expiree).toHaveBeenCalled();
    arreter();
  });

  it('réseau coupé : 503 ; réponse illisible : 503', async () => {
    serveur.use(msw.post('*/ws', () => HttpResponse.error()));
    await expect(appelSoap('Matériaux', NS, 'ListerMateriaux')).rejects.toMatchObject({
      status: 503,
    });

    serveur.use(msw.post('*/ws', () => new HttpResponse('pas du XML', { status: 200 })));
    await expect(appelSoap('Matériaux', NS, 'ListerMateriaux')).rejects.toMatchObject({
      status: 503,
      message: 'Réponse illisible du module Matériaux.',
    });
  });

  it('délai dépassé : 503 avec le délai dans le message', async () => {
    serveur.use(
      msw.post('*/ws', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return reponseSoap('<ns2:ListerMateriauxResponse xmlns:ns2="x"/>');
      }),
    );
    await expect(appelSoap('Matériaux', NS, 'ListerMateriaux', {}, {}, 50)).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('ne répond pas'),
    });
  });

  it('annulation : l’erreur d’annulation est propagée telle quelle', async () => {
    const controleur = new AbortController();
    controleur.abort();
    const e = await appelSoap(
      'Matériaux',
      NS,
      'ListerMateriaux',
      {},
      {
        signal: controleur.signal,
      },
    ).catch((x: unknown) => x);
    expect(e).not.toBeInstanceOf(ErreurApi);
  });
});
