import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { StatutTache, Tache } from '../src/taches/tache.schema';
import { TachesService } from '../src/taches/taches.service';

describe('TachesService', () => {
  let service: TachesService;
  const model = { create: jest.fn(), findById: jest.fn() };
  const chantiers = { verifierChantierActif: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };

  const dto = {
    chantierId: 1, titre: 'Fondations', dateDebut: '2026-11-02', dateFin: '2026-11-10',
    ouvrierIds: [1, 2], besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getModelToken(Tache.name), useValue: model },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: ouvriers },
        { provide: MateriauxSoapClient, useValue: materiaux },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  it('orchestre les 3 modules avant de créer la tâche', async () => {
    model.create.mockResolvedValue({ _id: 'x', ...dto });
    await service.creer(dto);
    expect(chantiers.verifierChantierActif).toHaveBeenCalledWith(1);
    expect(ouvriers.verifierDisponibles).toHaveBeenCalledWith([1, 2]);
    expect(materiaux.verifierStock).toHaveBeenCalledWith(1, 40);
    expect(model.create).toHaveBeenCalled();
  });

  it("ne crée rien si le stock est insuffisant", async () => {
    materiaux.verifierStock.mockRejectedValue(new UnprocessableEntityException('Stock insuffisant'));
    await expect(service.creer(dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('refuse une période incohérente sans appeler les autres modules', async () => {
    await expect(service.creer({ ...dto, dateFin: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(chantiers.verifierChantierActif).not.toHaveBeenCalled();
  });

  it.each([
    [0, StatutTache.A_FAIRE],
    [45, StatutTache.EN_COURS],
    [100, StatutTache.TERMINEE],
  ])('avancement %i %% → statut %s', async (avancement, statut) => {
    const tache = { statut: StatutTache.A_FAIRE, avancement: 0, save: jest.fn().mockImplementation(function (this: unknown) { return this; }) };
    model.findById.mockReturnValue({ exec: () => Promise.resolve(tache) });
    await service.mettreAJourAvancement('x', avancement);
    expect(tache.statut).toBe(statut);
  });
});

describe('MateriauxSoapClient', () => {
  it("lit la réponse SOAP quel que soit le préfixe d'espace de noms", () => {
    const xml = '<SOAP-ENV:Body><ns2:VerifierStockResponse><ns2:disponible>true</ns2:disponible></ns2:VerifierStockResponse></SOAP-ENV:Body>';
    expect(MateriauxSoapClient.lire(xml, 'disponible')).toBe('true');
  });
});
