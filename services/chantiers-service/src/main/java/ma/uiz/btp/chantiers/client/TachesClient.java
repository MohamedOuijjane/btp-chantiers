package ma.uiz.btp.chantiers.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

/** Client REST vers le module Tâches (NestJS). */
@Component
public class TachesClient {

    private static final Logger log = LoggerFactory.getLogger(TachesClient.class);

    public record TacheResume(String id, String titre, String statut, int avancement) {}

    private final RestClient http;

    public TachesClient(@Value("${services.taches.url}") String baseUrl,
                        @Value("${services.timeout:2s}") Duration timeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
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
