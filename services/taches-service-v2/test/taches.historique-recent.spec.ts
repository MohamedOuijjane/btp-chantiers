import { ConflictException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Repository } from 'typeorm';
import { HistoriqueStatut } from '../src/taches/historique.entity';
import { HistoriqueService } from '../src/taches/historique.service';
import { LimiteHistoriquePipe } from '../src/taches/limite-historique.pipe';
import { StatutTache } from '../src/taches/tache.entity';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

describe('HistoriqueService.recents (#142)', () => {
  const repo = { find: jest.fn() };
  const service = new HistoriqueService(repo as unknown as Repository<HistoriqueStatut>);

  it('les N derniers changements, toutes tâches, du plus récent au plus ancien', async () => {
    repo.find.mockResolvedValue([
      { id: 9, tacheId: 4, statut: 'BLOQUEE', date: new Date('2026-11-05T10:00:00Z'), motif: 'Pluie' },
      { id: 8, tacheId: 7, statut: 'EN_COURS', date: new Date('2026-11-04T08:00:00Z'), motif: null },
    ]);
    await expect(service.recents(2)).resolves.toEqual([
      { tacheId: 4, statut: 'BLOQUEE', date: '2026-11-05T10:00:00.000Z', motif: 'Pluie' },
      { tacheId: 7, statut: 'EN_COURS', date: '2026-11-04T08:00:00.000Z' },
    ]);
    expect(repo.find).toHaveBeenCalledWith({ order: { date: 'DESC', id: 'DESC' }, take: 2 });
  });
});

describe('LimiteHistoriquePipe (#142)', () => {
  const pipe = new LimiteHistoriquePipe();

  it.each([
    [undefined, '20'],
    ['1', '1'],
    ['100', '100'],
  ])('limite %s → %s', (valeur, attendu) => {
    expect(pipe.transform(valeur)).toBe(attendu);
  });

  it.each(['0', '101', 'abc', '1.5', '-1', ''])('limite « %s » : 400', (valeur) => {
    expect(() => pipe.transform(valeur)).toThrow(
      `Le paramètre limite doit être un entier entre 1 et 100 (reçu : « ${valeur} »)`,
    );
  });
});

describe('GET /api/taches/historique (#142)', () => {
  let app: INestApplication;
  const service = { historiqueRecent: jest.fn(), trouver: jest.fn() };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TachesController],
      providers: [{ provide: TachesService, useValue: service }],
    }).compile();
    app = mod.createNestApplication();
    // Même ValidationPipe que main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  it('sans limite : 20 entrées demandées ; la route ne passe pas par :id', async () => {
    service.historiqueRecent.mockResolvedValue([
      { tacheId: 4, statut: StatutTache.BLOQUEE, date: '2026-11-05T10:00:00.000Z', motif: 'Pluie' },
    ]);
    const r = await request(app.getHttpServer()).get('/api/taches/historique');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(1);
    expect(service.historiqueRecent).toHaveBeenCalledWith(20);
    expect(service.trouver).not.toHaveBeenCalled();
  });

  it('limite=5 : 5 entrées demandées', async () => {
    service.historiqueRecent.mockResolvedValue([]);
    const r = await request(app.getHttpServer()).get('/api/taches/historique?limite=5');
    expect(r.status).toBe(200);
    expect(service.historiqueRecent).toHaveBeenCalledWith(5);
  });

  it.each(['0', '101', 'abc'])('limite=%s : 400 sans appel au service', async (limite) => {
    const r = await request(app.getHttpServer()).get(`/api/taches/historique?limite=${limite}`);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(service.historiqueRecent).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/taches/:id/avancement sur une tâche bloquée (#143)', () => {
  let app: INestApplication;
  const service = { mettreAJourAvancement: jest.fn() };

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

  it('409 avec le message du service', async () => {
    service.mettreAJourAvancement.mockRejectedValue(
      new ConflictException('Débloquez la tâche avant de changer son avancement'),
    );
    const r = await request(app.getHttpServer()).patch('/api/taches/7/avancement').send({ avancement: 60 });
    expect(r.status).toBe(409);
    expect(r.body).toEqual({
      statusCode: 409,
      message: 'Débloquez la tâche avant de changer son avancement',
      error: 'Conflict',
    });
  });
});

describe('TachesService.historiqueRecent (#142)', () => {
  it('renvoie les entrées du journal', async () => {
    const journal = { recents: jest.fn().mockResolvedValue([{ tacheId: 1, statut: 'A_FAIRE', date: 'x' }]) };
    const service = new TachesService(
      ...([undefined, undefined, undefined, undefined, journal] as unknown as ConstructorParameters<
        typeof TachesService
      >),
    );
    await expect(service.historiqueRecent(3)).resolves.toHaveLength(1);
    expect(journal.recents).toHaveBeenCalledWith(3);
  });
});
