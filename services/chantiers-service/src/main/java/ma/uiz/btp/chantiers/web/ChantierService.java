package ma.uiz.btp.chantiers.web;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import ma.uiz.btp.chantiers.client.TachesClient;
import ma.uiz.btp.chantiers.domain.Chantier;
import ma.uiz.btp.chantiers.domain.ChantierRepository;
import ma.uiz.btp.chantiers.domain.RegleMetierException;
import ma.uiz.btp.chantiers.domain.RessourceIntrouvableException;
import ma.uiz.btp.chantiers.domain.StatutChantier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Règles de gestion des chantiers (RG1 à RG4) ; suppression vérifiée auprès de Tâches (#5). */
@Service
@Transactional
public class ChantierService {

    /** Titres de tâches cités dans le refus de suppression ; les suivantes sont comptées. */
    static final int TITRES_CITES = 5;

    private final ChantierRepository repository;
    private final TachesClient tachesClient;

    /** Crée le service avec le dépôt des chantiers et le client du module Tâches. */
    public ChantierService(ChantierRepository repository, TachesClient tachesClient) {
        this.repository = repository;
        this.tachesClient = tachesClient;
    }

    /** Liste les chantiers, tous ou ceux d'un statut donné. */
    @Transactional(readOnly = true)
    public List<Chantier> lister(StatutChantier statut) {
        return statut == null ? repository.findAll() : repository.findByStatut(statut);
    }

    /** Renvoie le chantier, ou lève RessourceIntrouvableException (404). */
    @Transactional(readOnly = true)
    public Chantier trouver(Long id) {
        return repository.findById(id)
                .orElseThrow(() ->
                        new RessourceIntrouvableException("Chantier " + id + " introuvable"));
    }

    /** RG4 : un nouveau chantier est toujours PLANIFIE, le statut envoyé est ignoré. */
    public Chantier creer(ChantierDto.Requete r) {
        verifierDonnees(r);
        Chantier c = new Chantier();
        appliquer(c, r);
        return repository.save(c);
    }

    /** Modifie un chantier qui n'est pas terminé ; le passage à TERMINE passe par la clôture. */
    public Chantier modifier(Long id, ChantierDto.Requete r) {
        Chantier c = trouver(id);
        c.verifierModifiable();
        if (r.statut() == StatutChantier.TERMINE) {
            throw new RegleMetierException("Un chantier ne peut pas passer à TERMINE par "
                    + "modification : utiliser PATCH /api/chantiers/" + id + "/cloture.");
        }
        verifierDonnees(r);
        appliquer(c, r);
        if (r.statut() != null) {
            c.setStatut(r.statut());
        }
        return c;
    }

    /** Clôture le chantier, qui devient non modifiable (RG-02). */
    public Chantier cloturer(Long id) {
        Chantier c = trouver(id);
        c.cloturer();
        return c;
    }

    /**
     * #5 : un chantier qui a des tâches (quel que soit leur statut, terminées comprises) ne peut
     * pas être supprimé, sinon ses tâches deviendraient orphelines dans le module Tâches (409).
     * Si Tâches ne peut pas être interrogé, rien n'est supprimé (503).
     */
    public void supprimer(Long id) {
        Chantier chantier = trouver(id);
        List<TachesClient.TacheResume> taches = tachesClient.tachesAvantSuppression(id);
        if (!taches.isEmpty()) {
            throw new RegleMetierException(messageRefusSuppression(chantier, taches));
        }
        repository.delete(chantier);
    }

    static String messageRefusSuppression(Chantier chantier,
                                          List<TachesClient.TacheResume> taches) {
        String titres = taches.stream().limit(TITRES_CITES)
                .map(t -> "« " + t.titre() + " »")
                .collect(Collectors.joining(", "));
        int autres = taches.size() - TITRES_CITES;
        return "Suppression impossible : le chantier « " + chantier.getNom() + " » a "
                + taches.size() + " tâche(s) : " + titres
                + (autres > 0 ? " et " + autres + " autre(s)" : "")
                + ". Supprimez ses tâches dans le module Tâches avant de supprimer le chantier.";
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
            return new ChantierDto.Avancement(id, 0, null, false);
        }
        List<TachesClient.TacheResume> liste = taches.get();
        double moyenne = liste.stream()
                .mapToInt(TachesClient.TacheResume::avancement).average().orElse(0);
        return new ChantierDto.Avancement(id, liste.size(), Math.round(moyenne * 10) / 10.0, true);
    }

    /**
     * RG1 (dates cohérentes) et budget positif ou nul, vérifiés dans le service et pas seulement
     * par la validation du DTO, qui ne s'applique qu'aux appels HTTP annotés @Valid.
     */
    private void verifierDonnees(ChantierDto.Requete r) {
        if (r.dateDebut() == null || r.dateFinPrevue() == null || r.budget() == null) {
            throw new RegleMetierException(
                    "La date de début, la date de fin prévue et le budget sont obligatoires.");
        }
        if (r.dateFinPrevue().isBefore(r.dateDebut())) {
            throw new RegleMetierException(
                    "La date de fin prévue doit être postérieure ou égale à la date de début.");
        }
        if (r.budget().signum() < 0) {
            throw new RegleMetierException("Le budget doit être positif ou nul.");
        }
    }

    private void appliquer(Chantier c, ChantierDto.Requete r) {
        c.setNom(r.nom());
        c.setAdresse(r.adresse());
        c.setClient(r.client());
        c.setDateDebut(r.dateDebut());
        c.setDateFinPrevue(r.dateFinPrevue());
        c.setBudget(r.budget());
    }
}
