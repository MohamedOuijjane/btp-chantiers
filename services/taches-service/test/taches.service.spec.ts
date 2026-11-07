import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { statutPourAvancement, TachesService, versReponse } from '../src/taches/taches.service';

/** Tâche telle que chargée par TypeORM. */
function tache(partiel: Partial<Tache> = {}): Tache {
  return Object.assign(new Tache(), {
    id: 7,
    chantierId: 1,
    titre: 'Fondations',
    description: null,
    dateDebut: '2026-11-02',
    dateFin: '2026-11-10',
    statut: StatutTache.A_FAIRE,
    avancement: 0,
    ouvrierIds: [1, 2],
    besoinsMateriaux: [{ tacheId: 7, materiauId: 1, quantite: 40 }],
    ...partiel,
  });
}

describe('TachesService', () => {
  let service: TachesService;
  const qb = {
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
  };
  const repo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
  const chantiers = { verifierChantierActif: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };

  const dto = {
    chantierId: 1,
    titre: 'Fondations',
    dateDebut: '2026-11-02',
    dateFin: '2026-11-10',
    ouvrierIds: [1, 2],
    besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const f of ['leftJoinAndSelect', 'orderBy', 'addOrderBy', 'andWhere'] as const) {
      qb[f].mockReturnValue(qb);
    }
    repo.createQueryBuilder.mockReturnValue(qb);
    repo.create.mockImplementation((x: Partial<Tache>) => x);
    repo.save.mockImplementation((x: Tache) => Promise.resolve({ ...x, id: 7 }));
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getRepositoryToken(Tache), useValue: repo },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: ouvriers },
        { provide: MateriauxSoapClient, useValue: materiaux },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  describe('creer', () => {
    it('orchestre les 3 modules puis enregistre la tâche avec un identifiant entier', async () => {
      repo.findOne.mockResolvedValue(tache());

      const r = await service.creer(dto);

      expect(chantiers.verifierChantierActif).toHaveBeenCalledWith(1);
      expect(ouvriers.verifierDisponibles).toHaveBeenCalledWith([1, 2]);
      expect(materiaux.verifierStock).toHaveBeenCalledWith(1, 40);
      expect(repo.create).toHaveBeenCalledWith({
        chantierId: 1,
        titre: 'Fondations',
        description: null,
        dateDebut: '2026-11-02',
        dateFin: '2026-11-10',
        statut: StatutTache.A_FAIRE,
        avancement: 0,
        ouvrierIds: [1, 2],
        besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
      });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(r).toEqual({
        id: 7,
        chantierId: 1,
        titre: 'Fondations',
        dateDebut: '2026-11-02',
        dateFin: '2026-11-10',
        statut: 'A_FAIRE',
        avancement: 0,
        ouvrierIds: [1, 2],
        besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
      });
      expect(r).not.toHaveProperty('_id');
    });

    it('garde seulement la date quand une date-heure ISO est envoyée', async () => {
      repo.findOne.mockResolvedValue(tache());
      await service.creer({ ...dto, dateDebut: '2026-11-02T08:00:00.000Z', dateFin: '2026-11-10T17:00:00Z' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ dateDebut: '2026-11-02', dateFin: '2026-11-10' }),
      );
    });

    it("sans ouvrier ni matériau : n'appelle ni Ouvriers ni Matériaux", async () => {
      repo.findOne.mockResolvedValue(tache({ ouvrierIds: [], besoinsMateriaux: [] }));
      await service.creer({ chantierId: 1, titre: 'Implantation', dateDebut: '2026-11-02', dateFin: '2026-11-02' });
      expect(ouvriers.verifierDisponibles).not.toHaveBeenCalled();
      expect(materiaux.verifierStock).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ ouvrierIds: [], besoinsMateriaux: [] }));
    });

    it("ne crée rien si le stock est insuffisant", async () => {
      materiaux.verifierStock.mockRejectedValue(new UnprocessableEntityException('Stock insuffisant'));
      await expect(service.creer(dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('refuse une période incohérente sans appeler les autres modules', async () => {
      await expect(service.creer({ ...dto, dateFin: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
      expect(chantiers.verifierChantierActif).not.toHaveBeenCalled();
    });

    it('refuse un même matériau deux fois (clé primaire tache_id, materiau_id)', async () => {
      const doublon = {
        ...dto,
        besoinsMateriaux: [
          { materiauId: 3, quantite: 1 },
          { materiauId: 3, quantite: 2 },
        ],
      };
      await expect(service.creer(doublon)).rejects.toThrow('Le matériau 3 apparaît plusieurs fois');
      expect(chantiers.verifierChantierActif).not.toHaveBeenCalled();
    });
  });

  describe('lister', () => {
    it('sans filtre : toutes les tâches triées par date de début', async () => {
      qb.getMany.mockResolvedValue([tache()]);
      const r = await service.lister({});
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('t.besoinsMateriaux', 'b');
      expect(qb.orderBy).toHaveBeenCalledWith('t.dateDebut', 'ASC');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe(7);
    });

    it('filtre par chantier et par ouvrier (ouvrier_ids contient l’ouvrier)', async () => {
      qb.getMany.mockResolvedValue([]);
      await service.lister({ chantierId: 3, ouvrierId: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('t.chantierId = :chantierId', { chantierId: 3 });
      expect(qb.andWhere).toHaveBeenCalledWith(':ouvrierId = ANY(t.ouvrier_ids)', { ouvrierId: 5 });
    });
  });

  describe('trouver et supprimer', () => {
    it('tâche inexistante : 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.trouver(99)).rejects.toThrow(new NotFoundException('Tâche 99 introuvable'));
    });

    it('supprime une tâche existante', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.supprimer(7)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith({ id: 7 });
    });

    it('suppression d’une tâche inexistante : 404', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.supprimer(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('avancement (RG5)', () => {
    it.each([
      [0, StatutTache.A_FAIRE],
      [45, StatutTache.EN_COURS],
      [100, StatutTache.TERMINEE],
    ])('avancement %i %% → statut %s', async (avancement, statut) => {
      repo.findOne.mockResolvedValue(tache({ statut: StatutTache.EN_COURS, avancement: 30 }));
      const r = await service.mettreAJourAvancement(7, avancement);
      expect(r.statut).toBe(statut);
      expect(r.avancement).toBe(avancement);
      expect(repo.save).toHaveBeenCalled();
    });

    it('une tâche bloquée garde son statut', async () => {
      repo.findOne.mockResolvedValue(tache({ statut: StatutTache.BLOQUEE }));
      const r = await service.mettreAJourAvancement(7, 60);
      expect(r.statut).toBe(StatutTache.BLOQUEE);
      expect(r.avancement).toBe(60);
    });

    it('statutPourAvancement', () => {
      expect(statutPourAvancement(1)).toBe(StatutTache.EN_COURS);
      expect(statutPourAvancement(99)).toBe(StatutTache.EN_COURS);
    });
  });

  describe('affecter', () => {
    it('vérifie les ouvriers puis remplace les affectations', async () => {
      repo.findOne.mockResolvedValue(tache());
      const r = await service.affecter(7, { ouvrierIds: [4] });
      expect(ouvriers.verifierDisponibles).toHaveBeenCalledWith([4]);
      expect(r.ouvrierIds).toEqual([4]);
    });

    it("n'enregistre rien si un ouvrier est indisponible", async () => {
      repo.findOne.mockResolvedValue(tache());
      ouvriers.verifierDisponibles.mockRejectedValue(new UnprocessableEntityException('indisponible'));
      await expect(service.affecter(7, { ouvrierIds: [4] })).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('versReponse', () => {
    it('garde la description quand elle existe et trie les besoins par matériau', () => {
      const r = versReponse(
        tache({
          description: 'Béton C25',
          besoinsMateriaux: [
            { tacheId: 7, materiauId: 4, quantite: 2 } as never,
            { tacheId: 7, materiauId: 2, quantite: 1.5 } as never,
          ],
        }),
      );
      expect(r.description).toBe('Béton C25');
      expect(r.besoinsMateriaux).toEqual([
        { materiauId: 2, quantite: 1.5 },
        { materiauId: 4, quantite: 2 },
      ]);
    });
  });
});
