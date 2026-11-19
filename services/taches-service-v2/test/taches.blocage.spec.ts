import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueService } from '../src/taches/historique.service';
import { BlocageDto } from '../src/taches/tache.dto';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesService } from '../src/taches/taches.service';

const { A_FAIRE, EN_COURS, TERMINEE, BLOQUEE } = StatutTache;

describe('TachesService.changerBlocage (#11)', () => {
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

  it('bloque une tâche EN_COURS et trace le motif', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS, avancement: 40 }));
    const r = await service.changerBlocage(7, { bloquee: true, motif: 'Pluie' });
    expect(r.statut).toBe(BLOQUEE);
    expect(r.avancement).toBe(40);
    expect(journal.enregistrer).toHaveBeenCalledWith(7, BLOQUEE, 'Pluie');
  });

  it('bloque une tâche A_FAIRE', async () => {
    repo.findOne.mockResolvedValue(tache());
    const r = await service.changerBlocage(7, { bloquee: true, motif: 'Permis' });
    expect(r.statut).toBe(BLOQUEE);
  });

  it.each([
    [0, A_FAIRE],
    [40, EN_COURS],
  ])('débloque : avancement %i -> %s (RG-05)', async (avancement, attendu) => {
    repo.findOne.mockResolvedValue(tache({ statut: BLOQUEE, avancement }));
    const r = await service.changerBlocage(7, { bloquee: false });
    expect(r.statut).toBe(attendu);
    expect(journal.enregistrer).toHaveBeenCalledWith(7, attendu, undefined);
  });

  it('409 : tâche TERMINEE non bloquable, rien écrit', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: TERMINEE, avancement: 100 }));
    await expect(service.changerBlocage(7, { bloquee: true, motif: 'x' })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it('409 : déjà bloquée', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: BLOQUEE }));
    await expect(service.changerBlocage(7, { bloquee: true, motif: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 : débloquer une tâche non bloquée', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS }));
    await expect(service.changerBlocage(7, { bloquee: false })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('409 : chantier clôturé, rien écrit', async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS }));
    chantiers.verifierChantierModifiable.mockRejectedValue(new ConflictException('clôturé'));
    await expect(service.changerBlocage(7, { bloquee: true, motif: 'x' })).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('404 : tâche inconnue', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.changerBlocage(99, { bloquee: false })).rejects.toBeInstanceOf(NotFoundException);
    expect(chantiers.verifierChantierModifiable).not.toHaveBeenCalled();
  });
});

describe('BlocageDto (validation)', () => {
  const erreurs = (o: object) => validate(plainToInstance(BlocageDto, o));

  it('bloquee=true sans motif : invalide', async () => {
    expect((await erreurs({ bloquee: true })).length).toBeGreaterThan(0);
  });
  it('bloquee=true avec motif : valide', async () => {
    expect(await erreurs({ bloquee: true, motif: 'Pluie' })).toHaveLength(0);
  });
  it('bloquee=false sans motif : valide', async () => {
    expect(await erreurs({ bloquee: false })).toHaveLength(0);
  });
  it('bloquee absent ou non booléen : invalide', async () => {
    expect((await erreurs({})).length).toBeGreaterThan(0);
    expect((await erreurs({ bloquee: 'oui' })).length).toBeGreaterThan(0);
  });
});