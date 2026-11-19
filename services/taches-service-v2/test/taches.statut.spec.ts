import { ConflictException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueService } from '../src/taches/historique.service';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

const { A_FAIRE, EN_COURS, TERMINEE, BLOQUEE } = StatutTache;

describe('TachesService.changerStatut (#99)', () => {
  let service: TachesService;
  const repo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const chantiers = { verifierChantierModifiable: jest.fn() };
  const journal = { enregistrer: jest.fn() };

  const tache = (partiel: Partial<Tache> = {}): Tache =>
    Object.assign(new Tache(), {
      id: 7, chantierId: 1, titre: 'Fondations', description: null,
      dateDebut: '2026-11-02', dateFin: '2026-11-10',
      statut: A_FAIRE, avancement: 0, ouvrierIds: [], besoinsMateriaux: [],
      ...partiel,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    repo.save.mockImplementation((x: Tache) => Promise.resolve({ ...x, id: 7 }));
    chantiers.verifierChantierModifiable.mockResolvedValue(undefined);
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getRepositoryToken(Tache), useValue: repo },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: {} },
        { provide: MateriauxSoapClient, useValue: {} },
        { provide: HistoriqueService, useValue: journal },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  it('A_FAIRE → EN_COURS : statut enregistré et tracé dans l\'historique', async () => {
    repo.findOne.mockResolvedValue(tache());
    const r = await service.changerStatut(7, EN_COURS);
    expect(r.statut).toBe(EN_COURS);
    expect(r.avancement).toBe(0);
    expect(journal.enregistrer).toHaveBeenCalledWith(7, EN_COURS);
    expect(chantiers.verifierChantierModifiable).toHaveBeenCalledWith(1);
  });

  it('EN_COURS → TERMINEE : avancement forcé à 100 %', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS, avancement: 45 }));
    const r = await service.changerStatut(7, TERMINEE);
    expect(r.statut).toBe(TERMINEE);
    expect(r.avancement).toBe(100);
    expect(journal.enregistrer).toHaveBeenCalledWith(7, TERMINEE);
  });

  it.each([
    ['A_FAIRE → TERMINEE', A_FAIRE, TERMINEE],
    ['TERMINEE → EN_COURS', TERMINEE, EN_COURS],
    ['tâche BLOQUEE → EN_COURS', BLOQUEE, EN_COURS],
  ])('%s : 409, rien enregistré, Chantiers non appelé', async (_nom, actuel, cible) => {
    repo.findOne.mockResolvedValue(tache({ statut: actuel }));
    await expect(service.changerStatut(7, cible)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(journal.enregistrer).not.toHaveBeenCalled();
    expect(chantiers.verifierChantierModifiable).not.toHaveBeenCalled();
  });

  it('chantier clôturé : 409, rien enregistré', async () => {
    repo.findOne.mockResolvedValue(tache());
    chantiers.verifierChantierModifiable.mockRejectedValue(
      new ConflictException('Le chantier « Villa » est clôturé : ses tâches ne peuvent plus changer'),
    );
    await expect(service.changerStatut(7, EN_COURS)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it('tâche inconnue : 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.changerStatut(99, EN_COURS)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ChantiersClient.verifierChantierModifiable (#99)', () => {
  const client = new ChantiersClient();
  let fetchSimule: jest.SpyInstance;
  const reponse = (status: number, corps?: unknown) => new Response(JSON.stringify(corps), { status });

  beforeEach(() => {
    fetchSimule = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchSimule.mockRestore());

  it.each(['PLANIFIE', 'EN_COURS', 'SUSPENDU'])('chantier %s : modifiable', async (statut) => {
    fetchSimule.mockResolvedValue(reponse(200, { id: 1, statut, nom: 'Villa Agadir' }));
    await expect(client.verifierChantierModifiable(1)).resolves.toBeUndefined();
  });

  it('chantier TERMINE : 409 avec le message attendu', async () => {
    fetchSimule.mockResolvedValue(reponse(200, { id: 1, statut: 'TERMINE', nom: 'Villa Agadir' }));
    const erreur = await client.verifierChantierModifiable(1).catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ConflictException);
    expect((erreur as Error).message).toBe(
      'Le chantier « Villa Agadir » est clôturé : ses tâches ne peuvent plus changer',
    );
  });

  it('chantier inconnu : 404', async () => {
    fetchSimule.mockResolvedValue(reponse(404));
    await expect(client.verifierChantierModifiable(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PATCH /api/taches/:id/statut (HTTP)', () => {
  let app: INestApplication;
  const service = { changerStatut: jest.fn() };

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

  const patch = (id: string, corps: object) =>
    request(app.getHttpServer()).patch(`/api/taches/${id}/statut`).send(corps);

  it.each(['EN_COURS', 'TERMINEE'])('statut %s : 200', async (statut) => {
    service.changerStatut.mockResolvedValue({ id: 12, statut });
    await patch('12', { statut }).expect(200, { id: 12, statut });
    expect(service.changerStatut).toHaveBeenCalledWith(12, statut);
  });

  it.each(['INCONNU', 'A_FAIRE', 'BLOQUEE', ''])('statut « %s » : 400 sans appel au service', async (statut) => {
    await patch('12', { statut }).expect(400);
    expect(service.changerStatut).not.toHaveBeenCalled();
  });

  it('statut absent : 400', async () => {
    await patch('12', {}).expect(400);
    expect(service.changerStatut).not.toHaveBeenCalled();
  });

  it('identifiant invalide : 400', async () => {
    await patch('abc', { statut: 'EN_COURS' }).expect(400);
    expect(service.changerStatut).not.toHaveBeenCalled();
  });

  it('conflit du service : 409 au format NestJS', async () => {
    service.changerStatut.mockRejectedValue(new ConflictException('Débloquez la tâche avant de changer son statut'));
    const r = await patch('12', { statut: 'EN_COURS' }).expect(409);
    expect(r.body).toEqual({
      statusCode: 409,
      message: 'Débloquez la tâche avant de changer son statut',
      error: 'Conflict',
    });
  });
});