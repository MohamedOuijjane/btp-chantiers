import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueService } from '../src/taches/historique.service';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesService } from '../src/taches/taches.service';

/**
 * #10 : conflit de planning d'un ouvrier (409). Ici le dépôt est simulé : on vérifie ce que le
 * service demande à la base et comment il réagit. Le chevauchement réel des dates (bornes
 * incluses, jour partagé, lendemain) est vérifié en SQL dans postgres.spec.ts.
 */
describe('TachesService : conflit de planning (#10)', () => {
  let service: TachesService;
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getOne: jest.fn(),
  };
  const repo = { createQueryBuilder: jest.fn(), create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const chantiers = { verifierChantierActif: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };
  const journal = { enregistrer: jest.fn(), motifsDuBlocage: jest.fn() };;

  const dto = {
    chantierId: 1,
    titre: 'Murs',
    dateDebut: '2026-11-06',
    dateFin: '2026-11-09',
    ouvrierIds: [3, 9],
  };

  const tache = (partiel: Partial<Tache> = {}): Tache =>
    Object.assign(new Tache(), {
      id: 7, chantierId: 1, titre: 'Murs', description: null,
      dateDebut: '2026-11-06', dateFin: '2026-11-09',
      statut: StatutTache.A_FAIRE, avancement: 0, ouvrierIds: [3], besoinsMateriaux: [],
      ...partiel,
    });

  /** La tâche déjà planifiée qui entre en conflit. */
  const dalle = tache({ id: 4, titre: 'Dalle', dateDebut: '2026-11-05', dateFin: '2026-11-08', ouvrierIds: [9, 3] });

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const f of ['where', 'andWhere', 'orderBy', 'addOrderBy'] as const) qb[f].mockReturnValue(qb);
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
        { provide: HistoriqueService, useValue: journal },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  describe('création', () => {
    it('conflit : 409 qui nomme l\'ouvrier et la tâche, rien n\'est enregistré', async () => {
      qb.getOne.mockResolvedValue(dalle);
      const erreur = await service.creer(dto).catch((e: unknown) => e);
      expect(erreur).toBeInstanceOf(ConflictException);
      // Demande [3, 9], tâche en conflit [9, 3] : on cite le premier ouvrier demandé (3).
      expect((erreur as Error).message).toBe(
        "L'ouvrier 3 est déjà affecté à « Dalle » (2026-11-05 → 2026-11-08) sur cette période",
      );
      expect(repo.save).not.toHaveBeenCalled();
      expect(journal.enregistrer).not.toHaveBeenCalled();
    });

    it('interroge la base avec la période, sans les tâches TERMINEE et sans exclure de tâche', async () => {
      await service.creer({ ...dto, dateDebut: '2026-11-06T08:00:00.000Z', dateFin: '2026-11-09T17:00:00Z' }).catch(() => undefined);
      expect(qb.where).toHaveBeenCalledWith('t.ouvrier_ids && CAST(:ouvrierIds AS integer[])', { ouvrierIds: [3, 9] });
      expect(qb.andWhere).toHaveBeenCalledWith('t.statut <> :termine', { termine: StatutTache.TERMINEE });
      expect(qb.andWhere).toHaveBeenCalledWith('t.dateDebut <= :fin', { fin: '2026-11-09' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.dateFin >= :debut', { debut: '2026-11-06' });
      expect(qb.andWhere).not.toHaveBeenCalledWith('t.id <> :exclureTacheId', expect.anything());
    });

    it('la disponibilité est vérifiée avant le planning', async () => {
      ouvriers.verifierDisponibles.mockRejectedValue(new Error('indisponible'));
      await expect(service.creer(dto)).rejects.toThrow('indisponible');
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('sans conflit : la tâche est enregistrée', async () => {
      qb.getOne.mockResolvedValue(null);
      repo.findOne.mockResolvedValue(tache());
      await service.creer(dto);
      expect(repo.save).toHaveBeenCalled();
    });

    it('sans ouvrier : aucune vérification de planning', async () => {
      repo.findOne.mockResolvedValue(tache({ ouvrierIds: [] }));
      await service.creer({ chantierId: 1, titre: 'Implantation', dateDebut: '2026-11-02', dateFin: '2026-11-02' });
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('affectation', () => {
    it('conflit : 409, affectations inchangées', async () => {
      repo.findOne.mockResolvedValue(tache());
      qb.getOne.mockResolvedValue(dalle);
      await expect(service.affecter(7, { ouvrierIds: [9] })).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('utilise les dates de la tâche et s\'exclut elle-même', async () => {
      repo.findOne.mockResolvedValue(tache());
      await service.affecter(7, { ouvrierIds: [9] });
      expect(qb.where).toHaveBeenCalledWith('t.ouvrier_ids && CAST(:ouvrierIds AS integer[])', { ouvrierIds: [9] });
      expect(qb.andWhere).toHaveBeenCalledWith('t.dateDebut <= :fin', { fin: '2026-11-09' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.dateFin >= :debut', { debut: '2026-11-06' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.id <> :exclureTacheId', { exclureTacheId: 7 });
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
