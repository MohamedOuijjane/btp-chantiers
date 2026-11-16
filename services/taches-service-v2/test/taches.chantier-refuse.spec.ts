import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { Tache } from '../src/taches/tache.entity';
import { TachesService } from '../src/taches/taches.service';

describe('TachesService.creer : chantier refusé (#12)', () => {
  let service: TachesService;
  const repo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const chantiers = { verifierChantierActif: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };

  const dto = {
    chantierId: 1,
    titre: 'Coulage des fondations',
    dateDebut: '2026-11-02',
    dateFin: '2026-11-10',
    ouvrierIds: [1, 2],
    besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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

  it.each(['suspendu', 'clôturé'])(
    'chantier %s : 409, aucune tâche créée, Ouvriers et Matériaux non appelés',
    async (etat) => {
      chantiers.verifierChantierActif.mockRejectedValue(
        new ConflictException(`Le chantier « Villa » est ${etat} : aucune tâche ne peut y être ajoutée`),
      );

      await expect(service.creer(dto)).rejects.toBeInstanceOf(ConflictException);

      expect(repo.save).not.toHaveBeenCalled();
      expect(ouvriers.verifierDisponibles).not.toHaveBeenCalled();
      expect(materiaux.verifierStock).not.toHaveBeenCalled();
    },
  );
});