import { ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChantiersClient } from '../src/clients/chantiers.client';
import { MateriauxSoapClient } from '../src/clients/materiaux.soap-client';
import { OuvriersClient } from '../src/clients/ouvriers.client';
import { HistoriqueService } from '../src/taches/historique.service';
import { StatutTache, Tache } from '../src/taches/tache.entity';
import { TachesService } from '../src/taches/taches.service';

/** #7 : un autre module en erreur ou muet (503) → la tâche n'est ni créée ni modifiée. */
describe('TachesService : module en erreur, rien n’est enregistré (#7)', () => {
  const repo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const chantiers = { verifierChantierActif: jest.fn(), verifierChantierModifiable: jest.fn() };
  const ouvriers = { verifierDisponibles: jest.fn() };
  const materiaux = { verifierStock: jest.fn() };
  const journal = { enregistrer: jest.fn(), lister: jest.fn(), motifsDuBlocage: jest.fn() };
  const service = new TachesService(
    repo as unknown as Repository<Tache>,
    chantiers as unknown as ChantiersClient,
    ouvriers as unknown as OuvriersClient,
    materiaux as unknown as MateriauxSoapClient,
    journal as unknown as HistoriqueService,
  );
  const panne = (module: string) => new ServiceUnavailableException(`Module ${module} en erreur (HTTP 500)`);
  const creation = (partiel = {}) => ({
    chantierId: 1,
    titre: 'Coulage de la dalle',
    dateDebut: '2027-03-02',
    dateFin: '2027-03-09',
    ...partiel,
  });

  beforeEach(() => jest.resetAllMocks());

  afterEach(() => {
    expect(repo.save).not.toHaveBeenCalled();
    expect(journal.enregistrer).not.toHaveBeenCalled();
  });

  it('Chantiers en erreur : 503, aucune tâche créée', async () => {
    chantiers.verifierChantierActif.mockRejectedValue(panne('Chantiers'));
    await expect(service.creer(creation())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(ouvriers.verifierDisponibles).not.toHaveBeenCalled();
  });

  it('Ouvriers en erreur : 503, aucune tâche créée', async () => {
    ouvriers.verifierDisponibles.mockRejectedValue(panne('Ouvriers'));
    await expect(service.creer(creation({ ouvrierIds: [4] }))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('Matériaux en erreur : 503, aucune tâche créée', async () => {
    materiaux.verifierStock.mockRejectedValue(panne('Matériaux'));
    await expect(
      service.creer(creation({ besoinsMateriaux: [{ materiauId: 3, quantite: 5 }] })),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('Chantiers en erreur pendant un changement de statut : 503, statut inchangé', async () => {
    repo.findOne.mockResolvedValue(
      Object.assign(new Tache(), { id: 7, chantierId: 1, statut: StatutTache.A_FAIRE, avancement: 0 }),
    );
    chantiers.verifierChantierModifiable.mockRejectedValue(panne('Chantiers'));
    await expect(service.changerStatut(7, StatutTache.EN_COURS)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
