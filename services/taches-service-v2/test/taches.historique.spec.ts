import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueStatut } from '../src/taches/historique.entity';
import { HistoriqueService } from '../src/taches/historique.service';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

describe('HistoriqueService (#99)', () => {
  const repo = { create: jest.fn(), save: jest.fn(), find: jest.fn() };
  const service = new HistoriqueService(repo as unknown as Repository<HistoriqueStatut>);

  beforeEach(() => jest.resetAllMocks());

  it('enregistre un changement de statut avec son motif', async () => {
    repo.create.mockImplementation((x: unknown) => x);
    await service.enregistrer(7, StatutTache.BLOQUEE, 'Pluie');
    expect(repo.create).toHaveBeenCalledWith({ tacheId: 7, statut: 'BLOQUEE', motif: 'Pluie' });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('sans motif : motif null', async () => {
    repo.create.mockImplementation((x: unknown) => x);
    await service.enregistrer(7, StatutTache.A_FAIRE);
    expect(repo.create).toHaveBeenCalledWith({ tacheId: 7, statut: 'A_FAIRE', motif: null });
  });

  it('liste du plus récent au plus ancien, motif absent quand il est vide', async () => {
    repo.find.mockResolvedValue([
      { id: 2, tacheId: 7, statut: 'EN_COURS', date: new Date('2026-11-03T08:00:00Z'), motif: null },
      { id: 1, tacheId: 7, statut: 'A_FAIRE', date: new Date('2026-11-02T08:00:00Z'), motif: 'Création' },
    ]);
    const r = await service.lister(7);
    expect(repo.find).toHaveBeenCalledWith({ where: { tacheId: 7 }, order: { date: 'DESC', id: 'DESC' } });
    expect(r).toEqual([
      { tacheId: 7, statut: 'EN_COURS', date: '2026-11-03T08:00:00.000Z' },
      { tacheId: 7, statut: 'A_FAIRE', date: '2026-11-02T08:00:00.000Z', motif: 'Création' },
    ]);
  });
});

describe('TachesService : historique des statuts (#99)', () => {
  let service: TachesService;
  const repo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const chantiers = { verifierChantierActif: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };
  const journal = { enregistrer: jest.fn(), lister: jest.fn() };

  const tache = (partiel: Partial<Tache> = {}): Tache =>
    Object.assign(new Tache(), {
      id: 7, chantierId: 1, titre: 'Fondations', description: null,
      dateDebut: '2026-11-02', dateFin: '2026-11-10',
      statut: StatutTache.A_FAIRE, avancement: 0, ouvrierIds: [], besoinsMateriaux: [],
      ...partiel,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    repo.create.mockImplementation((x: unknown) => x);
    repo.save.mockImplementation((x: Tache) => Promise.resolve({ ...x, id: 7 }));
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getRepositoryToken(Tache), useValue: repo },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: ouvriers },
        { provide: MateriauxSoapClient, useValue: materiaux },
        { provide: HistoriqueService, useValue: journal },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  it('création : une entrée A_FAIRE', async () => {
    repo.findOne.mockResolvedValue(tache());
    await service.creer({ chantierId: 1, titre: 'Fondations', dateDebut: '2026-11-02', dateFin: '2026-11-10' });
    expect(journal.enregistrer).toHaveBeenCalledWith(7, StatutTache.A_FAIRE);
  });

  it("création refusée : rien dans l'historique", async () => {
    chantiers.verifierChantierActif.mockRejectedValue(new Error('refusé'));
    await service.creer({ chantierId: 1, titre: 'x', dateDebut: '2026-11-02', dateFin: '2026-11-10' }).catch(() => undefined);
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it.each([
    [StatutTache.A_FAIRE, 0, 45, StatutTache.EN_COURS],
    [StatutTache.EN_COURS, 45, 100, StatutTache.TERMINEE],
    [StatutTache.EN_COURS, 45, 0, StatutTache.A_FAIRE],
  ])('avancement (RG5) %s %i → %i : entrée %s', async (statut, avant, apres, attendu) => {
    repo.findOne.mockResolvedValue(tache({ statut, avancement: avant }));
    await service.mettreAJourAvancement(7, apres);
    expect(journal.enregistrer).toHaveBeenCalledWith(7, attendu);
  });

  it('avancement sans changement de statut : aucune entrée', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: StatutTache.EN_COURS, avancement: 30 }));
    await service.mettreAJourAvancement(7, 60);
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it('tâche bloquée : le statut ne change pas, aucune entrée', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: StatutTache.BLOQUEE, avancement: 30 }));
    await service.mettreAJourAvancement(7, 60);
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it("historique(id) : renvoie l'historique du journal", async () => {
    repo.findOne.mockResolvedValue(tache());
    journal.lister.mockResolvedValue([{ tacheId: 7, statut: 'A_FAIRE', date: '2026-11-02T08:00:00.000Z' }]);
    await expect(service.historique(7)).resolves.toHaveLength(1);
    expect(journal.lister).toHaveBeenCalledWith(7);
  });

  it('historique(id) : 404 si la tâche est inconnue', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.historique(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(journal.lister).not.toHaveBeenCalled();
  });
});

describe('GET /api/taches/:id/historique (HTTP)', () => {
  let app: INestApplication;
  const service = { historique: jest.fn() };

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

  it('200 avec la liste', async () => {
    const entrees = [{ tacheId: 12, statut: 'TERMINEE', date: '2026-11-04T08:00:00.000Z' }];
    service.historique.mockResolvedValue(entrees);
    await request(app.getHttpServer()).get('/api/taches/12/historique').expect(200, entrees);
    expect(service.historique).toHaveBeenCalledWith(12);
  });

  it('identifiant invalide : 400 sans appel au service', async () => {
    await request(app.getHttpServer()).get('/api/taches/abc/historique').expect(400);
    expect(service.historique).not.toHaveBeenCalled();
  });

  it('tâche inconnue : 404', async () => {
    service.historique.mockRejectedValue(new NotFoundException('Tâche 99999 introuvable'));
    await request(app.getHttpServer()).get('/api/taches/99999/historique').expect(404);
  });
});