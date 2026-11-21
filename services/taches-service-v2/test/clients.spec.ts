import { ConflictException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { appel } from '../src/clients/http';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';

/** Clients REST et SOAP des autres modules : codes métier, erreurs des modules (#7) et SOAP Faults (#8). */
const reponse = (status: number, corps: unknown) =>
  new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), { status });

let fetchSimule: jest.SpyInstance;
beforeEach(() => {
  fetchSimule = jest.spyOn(global, 'fetch');
});
afterEach(() => {
  fetchSimule.mockRestore();
});

describe('appel (http.ts)', () => {
  it('module injoignable : 503', async () => {
    fetchSimule.mockRejectedValue(new TypeError('fetch failed'));
    await expect(appel('Chantiers', 'http://chantiers/api')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('transmet la réponse et un signal de délai', async () => {
    fetchSimule.mockResolvedValue(reponse(200, { ok: true }));
    const r = await appel('Chantiers', 'http://chantiers/api', { method: 'GET' });
    expect(r.status).toBe(200);
    expect(fetchSimule.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'GET', signal: expect.anything() }));
  });
});

describe('ChantiersClient (RG-03, #12)', () => {
  const client = new ChantiersClient();

  it.each(['PLANIFIE', 'EN_COURS'])('chantier %s : accepté', async (statut) => {
    fetchSimule.mockResolvedValue(reponse(200, { id: 1, statut, nom: 'Villa Agadir' }));
    await expect(client.verifierChantierActif(1)).resolves.toBeUndefined();
    expect(fetchSimule.mock.calls[0][0]).toMatch(/\/api\/chantiers\/1$/);
  });

  it('chantier inconnu : 404', async () => {
    fetchSimule.mockResolvedValue(reponse(404, { detail: 'Chantier 1 introuvable' }));
    await expect(client.verifierChantierActif(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('chantier SUSPENDU : 409 avec le nom du chantier', async () => {
    fetchSimule.mockResolvedValue(reponse(200, { id: 1, statut: 'SUSPENDU', nom: 'Villa Agadir' }));
    const erreur = await client.verifierChantierActif(1).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ConflictException);
    expect((erreur as Error).message).toBe(
      'Le chantier « Villa Agadir » est suspendu : aucune tâche ne peut y être ajoutée',
    );
  });

  it('chantier TERMINE : 409 (et non plus 422) avec le nom du chantier', async () => {
    fetchSimule.mockResolvedValue(reponse(200, { id: 2, statut: 'TERMINE', nom: 'Pont Souss' }));
    const erreur = await client.verifierChantierActif(2).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ConflictException);
    expect((erreur as Error).message).toBe(
      'Le chantier « Pont Souss » est clôturé : aucune tâche ne peut y être ajoutée',
    );
  });
});

describe('OuvriersClient', () => {
  const client = new OuvriersClient();

  it('ouvriers disponibles : acceptés', async () => {
    fetchSimule.mockImplementation(() => Promise.resolve(reponse(200, { disponible: true, nom: 'Bouzid' })));
    await expect(client.verifierDisponibles([1, 2])).resolves.toBeUndefined();
    expect(fetchSimule).toHaveBeenCalledTimes(2);
  });

  it('ouvrier inconnu : 422', async () => {
    fetchSimule.mockResolvedValue(reponse(404, { detail: 'Ouvrier 9 introuvable' }));
    await expect(client.verifierDisponibles([9])).rejects.toThrow('Ouvrier 9 introuvable');
  });

  it('ouvrier indisponible : 422 avec son nom', async () => {
    fetchSimule.mockResolvedValue(reponse(200, { disponible: false, nom: 'Bouzid' }));
    await expect(client.verifierDisponibles([3])).rejects.toThrow("L'ouvrier 3 (Bouzid) n'est pas disponible");
  });
});

describe('MateriauxSoapClient', () => {
  const client = new MateriauxSoapClient();
  const corps = (contenu: string) =>
    `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>${contenu}</SOAP-ENV:Body></SOAP-ENV:Envelope>`;

  it("construit l'enveloppe VerifierStock", () => {
    const xml = MateriauxSoapClient.enveloppe(3, 40);
    expect(xml).toContain('<m:VerifierStockRequest>');
    expect(xml).toContain('<m:materiauId>3</m:materiauId>');
    expect(xml).toContain('<m:quantite>40</m:quantite>');
  });

  it("lit la réponse SOAP quel que soit le préfixe d'espace de noms", () => {
    const xml = '<ns2:VerifierStockResponse><ns2:disponible>true</ns2:disponible></ns2:VerifierStockResponse>';
    expect(MateriauxSoapClient.lire(xml, 'disponible')).toBe('true');
    expect(MateriauxSoapClient.lire(xml, 'absent')).toBeUndefined();
  });

  it('stock suffisant : accepté (POST /ws en text/xml)', async () => {
    fetchSimule.mockResolvedValue(
      reponse(200, corps('<ns2:VerifierStockResponse><ns2:disponible>true</ns2:disponible><ns2:stockActuel>100</ns2:stockActuel></ns2:VerifierStockResponse>')),
    );
    await expect(client.verifierStock(1, 40)).resolves.toBeUndefined();
    const [url, init] = fetchSimule.mock.calls[0];
    expect(url).toMatch(/\/ws$/);
    expect(init).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  it('stock insuffisant : 422 avec le stock actuel', async () => {
    fetchSimule.mockResolvedValue(
      reponse(200, corps('<ns2:VerifierStockResponse><ns2:disponible>false</ns2:disponible><ns2:stockActuel>12</ns2:stockActuel></ns2:VerifierStockResponse>')),
    );
    await expect(client.verifierStock(1, 40)).rejects.toThrow(
      'Stock insuffisant pour le matériau 1 (demandé 40, disponible 12)',
    );
  });

  it('SOAP Fault sans attribut : 422 avec le message de la faute', async () => {
    fetchSimule.mockResolvedValue(
      reponse(500, corps('<SOAP-ENV:Fault><faultcode>SOAP-ENV:Client</faultcode><faultstring>Matériau 9 introuvable</faultstring></SOAP-ENV:Fault>')),
    );
    await expect(client.verifierStock(9, 1)).rejects.toThrow('Matériaux : Matériau 9 introuvable');
  });

  describe('SOAP Faults de Spring-WS (#8)', () => {
    /** Réponse réelle de Matériaux (HTTP 500) à VerifierStock pour un matériau inconnu. */
    const FAUTE_SPRING_WS =
      '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header/>' +
      '<SOAP-ENV:Body><SOAP-ENV:Fault><faultcode>SOAP-ENV:Client</faultcode>' +
      '<faultstring xml:lang="en">Matériau 99999 introuvable</faultstring></SOAP-ENV:Fault>' +
      '</SOAP-ENV:Body></SOAP-ENV:Envelope>';

    it('matériau inexistant : 422 avec le message de la faute (balise avec xml:lang)', async () => {
      fetchSimule.mockResolvedValue(reponse(500, FAUTE_SPRING_WS));
      const erreur = await client.verifierStock(99999, 1).catch((e: unknown) => e);
      expect(erreur).toBeInstanceOf(UnprocessableEntityException);
      expect((erreur as Error).message).toBe('Matériaux : Matériau 99999 introuvable');
      // Plus de faux « stock insuffisant … disponible undefined ».
      expect((erreur as Error).message).not.toMatch(/Stock insuffisant|undefined/);
    });

    it('lire() accepte les attributs et le préfixe sur la balise', () => {
      expect(MateriauxSoapClient.lire(FAUTE_SPRING_WS, 'faultstring')).toBe('Matériau 99999 introuvable');
      expect(MateriauxSoapClient.lire(FAUTE_SPRING_WS, 'faultcode')).toBe('SOAP-ENV:Client');
      expect(MateriauxSoapClient.lire('<ns2:stock unite="sac">40</ns2:stock>', 'stock')).toBe('40');
    });

    it('lire() ne confond pas une balise avec une autre qui commence pareil', () => {
      const xml = '<ns2:stockActuel>12</ns2:stockActuel><ns2:stock>40</ns2:stock>';
      expect(MateriauxSoapClient.lire(xml, 'stock')).toBe('40');
      expect(MateriauxSoapClient.lire(xml, 'stockActuel')).toBe('12');
    });

    it('lire() gère les retours à la ligne, les entités XML et les sections CDATA', () => {
      const indente = '<faultstring xml:lang="fr">\n    Référence &quot;CIM-1&quot; déjà utilisée &amp; refusée &#233;&#xE9;\n  </faultstring>';
      expect(MateriauxSoapClient.lire(indente, 'faultstring')).toBe('Référence "CIM-1" déjà utilisée & refusée éé');
      expect(MateriauxSoapClient.lire('<faultstring><![CDATA[a < b & c]]></faultstring>', 'faultstring')).toBe('a < b & c');
    });

    it('faute avec un code personnalisé (#102) et un préfixe de namespace : toujours 422', async () => {
      fetchSimule.mockResolvedValue(
        reponse(
          500,
          corps(
            '<SOAP-ENV:Fault><faultcode xmlns:m="http://btp.uiz.ma/materiaux">m:Introuvable</faultcode>' +
              '<faultstring xml:lang="fr">Matériau 9 introuvable</faultstring></SOAP-ENV:Fault>',
          ),
        ),
      );
      await expect(client.verifierStock(9, 1)).rejects.toThrow(
        new UnprocessableEntityException('Matériaux : Matériau 9 introuvable'),
      );
    });

    it('faute sans faultstring : 422 qui cite le faultcode', async () => {
      fetchSimule.mockResolvedValue(reponse(500, corps('<soap:Fault><faultcode>soap:Server</faultcode></soap:Fault>')));
      await expect(client.verifierStock(1, 1)).rejects.toThrow('Matériaux : erreur SOAP soap:Server');
    });

    it('estFaute() ne se déclenche pas sur une réponse normale', () => {
      expect(MateriauxSoapClient.estFaute(FAUTE_SPRING_WS)).toBe(true);
      expect(MateriauxSoapClient.estFaute(corps('<ns2:VerifierStockResponse/>'))).toBe(false);
    });
  });
});

describe('Erreur ou absence de réponse d’un autre module : 503 (#7)', () => {
  const chantiers = new ChantiersClient();
  const ouvriers = new OuvriersClient();
  const materiaux = new MateriauxSoapClient();
  const delai = () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });

  it.each([500, 502, 503, 504])('Chantiers répond %i : 503, le chantier n’est pas accepté', async (status) => {
    fetchSimule.mockResolvedValue(reponse(status, { status, detail: 'Erreur interne' }));
    await expect(chantiers.verifierChantierActif(1)).rejects.toThrow(
      new ServiceUnavailableException(`Module Chantiers en erreur (HTTP ${status})`),
    );
  });

  it('Chantiers en erreur pendant un changement de statut : 503', async () => {
    fetchSimule.mockResolvedValue(reponse(500, { detail: 'Erreur interne' }));
    await expect(chantiers.verifierChantierModifiable(1)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('Chantiers ne répond pas (délai dépassé) : 503', async () => {
    fetchSimule.mockRejectedValue(delai());
    await expect(chantiers.verifierChantierActif(1)).rejects.toThrow(/Module Chantiers injoignable/);
  });

  it('Chantiers répond 200 avec un corps illisible : 503', async () => {
    fetchSimule.mockResolvedValue(reponse(200, '<html>proxy</html>'));
    await expect(chantiers.verifierChantierActif(1)).rejects.toThrow(
      new ServiceUnavailableException('Module Chantiers : réponse illisible'),
    );
  });

  it.each([500, 503])('Ouvriers répond %i : 503 (et non « ouvrier indisponible »)', async (status) => {
    fetchSimule.mockResolvedValue(reponse(status, { detail: 'Erreur interne' }));
    const erreur = await ouvriers.verifierDisponibles([4]).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ServiceUnavailableException);
    expect((erreur as Error).message).toBe(`Module Ouvriers en erreur (HTTP ${status})`);
  });

  it('Ouvriers ne répond pas (délai dépassé) : 503', async () => {
    fetchSimule.mockRejectedValue(delai());
    await expect(ouvriers.verifierDisponibles([4])).rejects.toThrow(/Module Ouvriers injoignable/);
  });

  it('Matériaux répond 502 sans SOAP Fault : 503 (et non « stock insuffisant »)', async () => {
    fetchSimule.mockResolvedValue(reponse(502, '<html>Bad Gateway</html>'));
    await expect(materiaux.verifierStock(1, 5)).rejects.toThrow(
      new ServiceUnavailableException('Module Matériaux en erreur (HTTP 502)'),
    );
  });

  it('Matériaux ne répond pas (délai dépassé) : 503', async () => {
    fetchSimule.mockRejectedValue(delai());
    await expect(materiaux.verifierStock(1, 5)).rejects.toThrow(/Module Matériaux injoignable/);
  });
});
