import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

/** Routes HTTP : conversion des paramètres et validation des corps (même ValidationPipe que main.ts). */
describe('TachesController (HTTP)', () => {
  let app: INestApplication;
  const service = {
    lister: jest.fn(),
    trouver: jest.fn(),
    creer: jest.fn(),
    mettreAJourAvancement: jest.fn(),
    affecter: jest.fn(),
    supprimer: jest.fn(),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TachesController],
      providers: [{ provide: TachesService, useValue: service }],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  it('GET /api/taches?chantierId=&ouvrierId= : filtres convertis en nombres', async () => {
    service.lister.mockResolvedValue([{ id: 1 }]);
    await request(app.getHttpServer()).get('/api/taches?chantierId=3&ouvrierId=5').expect(200, [{ id: 1 }]);
    expect(service.lister).toHaveBeenCalledWith({ chantierId: 3, ouvrierId: 5 });
  });

  it('GET /api/taches sans filtre', async () => {
    service.lister.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/taches').expect(200, []);
    expect(service.lister).toHaveBeenCalledWith({ chantierId: undefined, ouvrierId: undefined });
  });

  it('GET /api/taches/12 : identifiant entier', async () => {
    service.trouver.mockResolvedValue({ id: 12 });
    await request(app.getHttpServer()).get('/api/taches/12').expect(200, { id: 12 });
    expect(service.trouver).toHaveBeenCalledWith(12);
  });

  it('POST /api/taches : 201', async () => {
    service.creer.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer())
      .post('/api/taches')
      .send({ chantierId: 1, titre: 'Fondations', dateDebut: '2026-11-02', dateFin: '2026-11-10' })
      .expect(201, { id: 1 });
  });

  it('POST /api/taches invalide : 400 sans appel au service', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/taches')
      .send({ chantierId: 'x', titre: '', dateDebut: 'demain', inconnu: 1 })
      .expect(400);
    expect(r.body.message).toEqual(expect.arrayContaining([expect.stringContaining('titre')]));
    expect(service.creer).not.toHaveBeenCalled();
  });

  it('PATCH /api/taches/12/avancement', async () => {
    service.mettreAJourAvancement.mockResolvedValue({ id: 12, avancement: 60 });
    await request(app.getHttpServer()).patch('/api/taches/12/avancement').send({ avancement: 60 }).expect(200);
    expect(service.mettreAJourAvancement).toHaveBeenCalledWith(12, 60);
  });

  it('PATCH /api/taches/12/avancement > 100 : 400', async () => {
    await request(app.getHttpServer()).patch('/api/taches/12/avancement').send({ avancement: 120 }).expect(400);
  });

  it('PATCH /api/taches/12/ouvriers', async () => {
    service.affecter.mockResolvedValue({ id: 12, ouvrierIds: [3] });
    await request(app.getHttpServer()).patch('/api/taches/12/ouvriers').send({ ouvrierIds: [3] }).expect(200);
    expect(service.affecter).toHaveBeenCalledWith(12, { ouvrierIds: [3] });
  });

  it('DELETE /api/taches/12 : 204', async () => {
    service.supprimer.mockResolvedValue(undefined);
    await request(app.getHttpServer()).delete('/api/taches/12').expect(204);
    expect(service.supprimer).toHaveBeenCalledWith(12);
  });
});
