import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

/** #9 : identifiant invalide → 400, tâche inexistante → 404, sur les 4 routes avec :id. */
describe('TachesController : identifiant de tâche (#9)', () => {
  let app: INestApplication;
  const service = {
    lister: jest.fn(),
    trouver: jest.fn(),
    creer: jest.fn(),
    mettreAJourAvancement: jest.fn(),
    affecter: jest.fn(),
    supprimer: jest.fn(),
  };

  type Methode = 'get' | 'patch' | 'delete';
  const ROUTES: [string, Methode, string, object | undefined, keyof typeof service][] = [
    ['GET /:id', 'get', '', undefined, 'trouver'],
    ['PATCH /:id/avancement', 'patch', '/avancement', { avancement: 50 }, 'mettreAJourAvancement'],
    ['PATCH /:id/ouvriers', 'patch', '/ouvriers', { ouvrierIds: [1] }, 'affecter'],
    ['DELETE /:id', 'delete', '', undefined, 'supprimer'],
  ];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TachesController],
      providers: [{ provide: TachesService, useValue: service }],
    }).compile();
    app = mod.createNestApplication();
    // Même ValidationPipe que main.ts : il convertit les paramètres typés number avant les pipes de route.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  const appeler = (methode: Methode, chemin: string, corps?: object) => {
    const req = request(app.getHttpServer())[methode](chemin);
    return corps ? req.send(corps) : req;
  };

  describe.each(ROUTES)('%s', (_nom, methode, suffixe, corps, cle) => {
    it.each(['abc', '-1', '0', '1.5'])('identifiant « %s » : 400 sans appel au service', async (id) => {
      const r = await appeler(methode, `/api/taches/${id}${suffixe}`, corps);
      expect(r.status).toBe(400);
      expect(r.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(r.body.message).toContain(`« ${id} »`);
      expect(service[cle]).not.toHaveBeenCalled();
    });

    it('identifiant entier inexistant : 404 « Tâche 99999 introuvable »', async () => {
      service[cle].mockRejectedValue(new NotFoundException('Tâche 99999 introuvable'));
      const r = await appeler(methode, `/api/taches/99999${suffixe}`, corps);
      expect(r.status).toBe(404);
      expect(r.body).toEqual({ statusCode: 404, message: 'Tâche 99999 introuvable', error: 'Not Found' });
    });
  });
});