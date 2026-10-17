package ma.uiz.btp.chantiers.web;

import ma.uiz.btp.chantiers.client.TachesClient;
import ma.uiz.btp.chantiers.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ChantierService {

    private final ChantierRepository repository;
    private final TachesClient tachesClient;

    public ChantierService(ChantierRepository repository, TachesClient tachesClient) {
        this.repository = repository;
        this.tachesClient = tachesClient;
    }

    @Transactional(readOnly = true)
    public List<Chantier> lister(StatutChantier statut) {
        return statut == null ? repository.findAll() : repository.findByStatut(statut);
    }

    @Transactional(readOnly = true)
    public Chantier trouver(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RessourceIntrouvableException("Chantier " + id + " introuvable"));
    }

    public Chantier creer(ChantierDto.Requete r) {
        Chantier c = new Chantier();
        appliquer(c, r);
        return repository.save(c);
    }

    public Chantier modifier(Long id, ChantierDto.Requete r) {
        Chantier c = trouver(id);
        c.verifierModifiable();
        appliquer(c, r);
        return c;
    }

    public Chantier cloturer(Long id) {
        Chantier c = trouver(id);
        c.cloturer();
        return c;
    }

    public void supprimer(Long id) {
        repository.delete(trouver(id));
    }

    /**
     * Avancement global = moyenne des pourcentages des tâches du chantier.
     * Si le module Tâches est indisponible, on renvoie une réponse dégradée
     * plutôt qu'une erreur (procédure dégradée, cf. cours QL).
     */
    @Transactional(readOnly = true)
    public ChantierDto.Avancement avancement(Long id) {
        trouver(id);
        Optional<List<TachesClient.TacheResume>> taches = tachesClient.tachesDuChantier(id);
        if (taches.isEmpty()) {
            return new ChantierDto.Avancement(id, null, null, false);
        }
        List<TachesClient.TacheResume> liste = taches.get();
        double moyenne = liste.stream().mapToInt(TachesClient.TacheResume::avancement).average().orElse(0);
        return new ChantierDto.Avancement(id, liste.size(), Math.round(moyenne * 10) / 10.0, true);
    }

    private void appliquer(Chantier c, ChantierDto.Requete r) {
        c.setNom(r.nom());
        c.setAdresse(r.adresse());
        c.setClient(r.client());
        c.setDateDebut(r.dateDebut());
        c.setDateFinPrevue(r.dateFinPrevue());
        c.setBudget(r.budget());
        if (r.statut() != null) {
            c.setStatut(r.statut());
        }
    }
}
