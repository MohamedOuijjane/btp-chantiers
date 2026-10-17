package ma.uiz.btp.materiaux.client;

import ma.uiz.btp.materiaux.domain.IntrouvableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/** Le module Matériaux (SOAP) consomme l'API REST du module Chantiers. */
@Component
public class ChantiersClient {

    private final RestClient http;

    public ChantiersClient(@Value("${services.chantiers.url}") String baseUrl,
                           @Value("${services.timeout:2s}") Duration timeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    /** Vérifie que le chantier destinataire existe et n'est pas terminé. */
    public void verifierChantierActif(Long chantierId) {
        record ChantierResume(Long id, String statut) {}
        try {
            ChantierResume c = http.get().uri("/api/chantiers/{id}", chantierId).retrieve().body(ChantierResume.class);
            if (c != null && "TERMINE".equals(c.statut())) {
                throw new IntrouvableException("Le chantier " + chantierId + " est terminé");
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new IntrouvableException("Chantier " + chantierId + " introuvable");
            }
            throw e;
        }
    }
}
