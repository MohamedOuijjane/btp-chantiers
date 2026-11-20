package ma.uiz.btp.chantiers.client;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import ma.uiz.btp.chantiers.domain.ServiceIndisponibleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Client REST vers le module Tâches (NestJS). */
@Component
public class TachesClient {

    private static final Logger log = LoggerFactory.getLogger(TachesClient.class);

    public record TacheResume(String id, String titre, String statut, int avancement) {}

    private static final ParameterizedTypeReference<List<TacheResume>> LISTE_TACHES =
            new ParameterizedTypeReference<>() {};

    private final RestClient http;

    public TachesClient(@Value("${services.taches.url}") String baseUrl,
                        @Value("${services.timeout:2s}") Duration timeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    /**
     * Tâches du chantier avant sa suppression (#5). Pas de dégradation ici : on ne supprime
     * jamais sans avoir pu vérifier. Un 404 de Tâches vaut « aucune tâche ».
     *
     * @throws ServiceIndisponibleException si Tâches ne répond pas, répond en erreur (5xx ou
     *     autre code inattendu) ou renvoie une réponse illisible
     */
    public List<TacheResume> tachesAvantSuppression(Long chantierId) {
        try {
            List<TacheResume> taches = http.get()
                    .uri("/api/taches?chantierId={id}", chantierId)
                    .exchange((requete, reponse) -> {
                        if (reponse.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                            return List.of();
                        }
                        if (!reponse.getStatusCode().is2xxSuccessful()) {
                            throw indisponible("réponse HTTP " + reponse.getStatusCode().value());
                        }
                        return reponse.bodyTo(LISTE_TACHES);
                    });
            if (taches == null) {
                throw indisponible("réponse vide");
            }
            return taches;
        } catch (RestClientException e) {
            throw indisponible(e.getClass().getSimpleName());
        }
    }

    private static ServiceIndisponibleException indisponible(String cause) {
        log.warn("Module Tâches indisponible avant une suppression de chantier : {}", cause);
        return new ServiceIndisponibleException("Le module Tâches ne répond pas : impossible "
                + "de vérifier les tâches du chantier, suppression annulée. Réessayez plus tard.");
    }

    /** @return vide si le service Tâches est injoignable (dégradation contrôlée). */
    public Optional<List<TacheResume>> tachesDuChantier(Long chantierId) {
        try {
            return Optional.ofNullable(http.get()
                    .uri("/api/taches?chantierId={id}", chantierId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<TacheResume>>() {}));
        } catch (RestClientException e) {
            log.warn("Module Tâches indisponible : {}", e.getMessage());
            return Optional.empty();
        }
    }
}
