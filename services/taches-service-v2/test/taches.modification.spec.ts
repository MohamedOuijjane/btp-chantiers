import {
  BadRequestException, ConflictException, HttpException, INestApplication, NotFoundException,
  ServiceUnavailableException, UnprocessableEntityException, ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueService } from '../src/taches/historique.service';
import { BesoinMateriau, StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesController } from '../src/taches/taches.controller';
import { TachesService } from '../src/taches/taches.service';

describe('TachesService.modifier (#99)', () => {
  let service: TachesService;
  const qb = { where: jest.fn(), andWhere: jest.fn(), orderBy: jest.fn(), addOrderBy: jest.fn(), getOne: jest.fn() };
  const manager = { delete: jest.fn(), update: jest.fn(), insert: jest.fn() };
  const repo = { findOne: jest.fn(), createQueryBuilder: jest.fn(), manager: { transaction: jest.fn() } };
  const chantiers = { verifierChantierActif: jest.fn(), verifierChantierModifiable: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };

  const dto = {
    chantierId: 1,
    titre: 'Fondations (modifiée)',
    description: 'Béton C30',
    dateDebut: '2026-11-03',
    dateFin: '2026-11-12',
    ouvrierIds: [3, 9],
    besoinsMateriaux: [{ materiauId: 1, quantite: 50 }],
  };

  const tache = (partiel: Partial<Tache> = {}): Tache =>
    Object.assign(new Tache(), {
      id: 7, chantierId: 1, titre: 'Fondations', description: null,
      dateDebut: '2026-11-02', dateFin: '2026-11-10',
      statut: StatutTache.EN_COURS, avancement: 40, ouvrierIds: [3],
      besoinsMateriaux: [{ tacheId: 7, materiauId: 1, quantite: 40 }],
      ...partiel,
    });

  const aucuneEcriture = () => expect(repo.manager.transaction).not.toHaveBeenCalled();

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const f of ['where', 'andWhere', 'orderBy', 'addOrderBy'] as const) qb[f].mockReturnValue(qb);
    repo.createQueryBuilder.mockReturnValue(qb);
    repo.manager.transaction.mockImplementation((cb: (m: typeof manager) => Promise<void>) => cb(manager));
    repo.findOne.mockResolvedValue(tache());
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getRepositoryToken(Tache), useValue: repo },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: ouvriers },
        { provide: MateriauxSoapClient, useValue: materiaux },
        { provide: HistoriqueService, useValue: { enregistrer: jest.fn() } },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  it('modifie la tâche : champs, ouvriers et besoins remplacés dans une transaction', async () => {
    repo.findOne
      .mockResolvedValueOnce(tache())
      .mockResolvedValueOnce(tache({ titre: 'Fondations (modifiée)', ouvrierIds: [3, 9] }));
    const r = await service.modifier(7, dto);
    expect(r.titre).toBe('Fondations (modifiée)');
    expect(manager.delete).toHaveBeenCalledWith(BesoinMateriau, { tacheId: 7 });
    expect(manager.update).toHaveBeenCalledWith(Tache, 7, {
      chantierId: 1, titre: 'Fondations (modifiée)', description: 'Béton C30',
      dateDebut: '2026-11-03', dateFin: '2026-11-12', ouvrierIds: [3, 9],
    });
    expect(manager.insert).toHaveBeenCalledWith(BesoinMateriau, [{ tacheId: 7, materiauId: 1, quantite: 50 }]);
    expect(ouvriers.verifierDisponibles).toHaveBeenCalledWith([3, 9]);
    expect(materiaux.verifierStock).toHaveBeenCalledWith(1, 50);
  });

  it('sans besoins : les anciens sont supprimés, rien n\'est inséré ni vérifié', async () => {
    await service.modifier(7, { ...dto, besoinsMateriaux: [] });
    expect(manager.delete).toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
    expect(materiaux.verifierStock).not.toHaveBeenCalled();
  });

  it('sans ouvriers : aucune vérification de disponibilité ni de planning', async () => {
    await service.modifier(7, { ...dto, ouvrierIds: [] });
    expect(ouvriers.verifierDisponibles).not.toHaveBeenCalled();
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    expect(manager.update).toHaveBeenCalledWith(Tache, 7, expect.objectContaining({ ouvrierIds: [] }));
  });

  it('tâche inconnue : 404, aucun module appelé', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.modifier(99, dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(chantiers.verifierChantierModifiable).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('dateFin avant dateDebut : 400, aucun module appelé', async () => {
    await expect(service.modifier(7, { ...dto, dateDebut: '2026-11-10', dateFin: '2026-11-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chantiers.verifierChantierModifiable).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('même matériau deux fois : 400', async () => {
    const besoinsMateriaux = [{ materiauId: 1, quantite: 5 }, { materiauId: 1, quantite: 6 }];
    await expect(service.modifier(7, { ...dto, besoinsMateriaux })).rejects.toBeInstanceOf(BadRequestException);
    aucuneEcriture();
  });

  it('chantier clôturé : 409, ni ouvriers ni matériaux appelés, rien modifié', async () => {
    chantiers.verifierChantierModifiable.mockRejectedValue(
      new ConflictException('Le chantier « Villa » est clôturé : ses tâches ne peuvent plus changer'),
    );
    await expect(service.modifier(7, dto)).rejects.toThrow('ses tâches ne peuvent plus changer');
    expect(ouvriers.verifierDisponibles).not.toHaveBeenCalled();
    expect(materiaux.verifierStock).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('même chantier : seul le contrôle « modifiable » est appelé', async () => {
    await service.modifier(7, dto);
    expect(chantiers.verifierChantierModifiable).toHaveBeenCalledWith(1);
    expect(chantiers.verifierChantierActif).not.toHaveBeenCalled();
  });

  it('autre chantier : le nouveau chantier doit accepter une tâche (RG-03)', async () => {
    await service.modifier(7, { ...dto, chantierId: 2 });
    expect(chantiers.verifierChantierActif).toHaveBeenCalledWith(2);
  });

  it('autre chantier suspendu : 409, rien modifié', async () => {
    chantiers.verifierChantierActif.mockRejectedValue(new ConflictException('Le chantier « Pont » est suspendu'));
    await expect(service.modifier(7, { ...dto, chantierId: 2 })).rejects.toBeInstanceOf(ConflictException);
    aucuneEcriture();
  });

  it('ouvrier occupé sur une autre tâche : 409, la tâche elle-même est exclue, rien modifié', async () => {
    qb.getOne.mockResolvedValue(
      tache({ id: 4, titre: 'Dalle', dateDebut: '2026-11-05', dateFin: '2026-11-08', ouvrierIds: [9] }),
    );
    await expect(service.modifier(7, dto)).rejects.toThrow(
      "L'ouvrier 9 est déjà affecté à « Dalle » (2026-11-05 → 2026-11-08) sur cette période",
    );
    expect(qb.andWhere).toHaveBeenCalledWith('t.id <> :exclureTacheId', { exclureTacheId: 7 });
    aucuneEcriture();
  });

  it('ouvrier indisponible : 422, rien modifié', async () => {
    ouvriers.verifierDisponibles.mockRejectedValue(new UnprocessableEntityException("L'ouvrier 9 n'est pas disponible"));
    await expect(service.modifier(7, dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(materiaux.verifierStock).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('stock insuffisant (SOAP simulé) : 422, rien modifié', async () => {
    materiaux.verifierStock.mockRejectedValue(new UnprocessableEntityException('Matériaux : stock insuffisant'));
    await expect(service.modifier(7, dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
    aucuneEcriture();
  });

  it.each([
    ['Chantiers', () => chantiers.verifierChantierModifiable],
    ['Ouvriers', () => ouvriers.verifierDisponibles],
    ['Matériaux', () => materiaux.verifierStock],
  ])('module %s injoignable : 503, rien modifié', async (nom, mock) => {
    mock().mockRejectedValue(new ServiceUnavailableException(`Module ${nom} injoignable`));
    await expect(service.modifier(7, dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    aucuneEcriture();
  });
});

describe('PUT /api/taches/:id (HTTP)', () => {
  let app: INestApplication;
  const service = { modifier: jest.fn() };
  const corps = {
    chantierId: 1, titre: 'Fondations', dateDebut: '2026-11-02', dateFin: '2026-11-10',
    ouvrierIds: [1], besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
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

  const put = (id: string, body: object) => request(app.getHttpServer()).put(`/api/taches/${id}`).send(body);

  it('200 avec la tâche modifiée', async () => {
    service.modifier.mockResolvedValue({ id: 12, titre: 'Fondations' });
    await put('12', corps).expect(200, { id: 12, titre: 'Fondations' });
    expect(service.modifier).toHaveBeenCalledWith(12, corps);
  });

  it('identifiant invalide : 400 sans appel au service', async () => {
    await put('abc', corps).expect(400);
    expect(service.modifier).not.toHaveBeenCalled();
  });

  it.each([
    ['titre vide', { ...corps, titre: '' }],
    ['dateFin absente', { ...corps, dateFin: undefined }],
    ['champ inconnu', { ...corps, couleur: 'rouge' }],
  ])('corps invalide (%s) : 400 sans appel au service', async (_nom, body) => {
    await put('12', body).expect(400);
    expect(service.modifier).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Tâche 12 introuvable'],
    [409, 'Le chantier « Villa » est clôturé : ses tâches ne peuvent plus changer'],
    [422, 'Stock insuffisant'],
    [503, 'Le module Ouvriers est indisponible, réessayez dans un instant.'],
  ])('le refus %i du service est renvoyé au format NestJS', async (status, message) => {
    service.modifier.mockRejectedValue(new HttpException(message, status));
    const r = await put('12', corps).expect(status);
    expect(r.body).toMatchObject({ statusCode: status, message });
  });
});