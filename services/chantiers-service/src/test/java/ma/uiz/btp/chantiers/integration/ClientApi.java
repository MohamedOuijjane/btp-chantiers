package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Client HTTP des scénarios : vraies requêtes réseau vers le service démarré sur un port aléatoire.
 * Chaque appel est chronométré : le temps de réponse doit rester sous {@link #SEUIL_MS}, et les
 * durées sont résumées à la fin de l'exécution (voir {@link RapportExecution}).
 */
final class ClientApi {

    /** Critère de succès commun à tous les scénarios : réponse en moins de 2 s. */
    static final long SEUIL_MS = 2000;

    /** Durée (ms) de chaque appel, pour le temps moyen du rapport d'exécution. */
    static final ConcurrentLinkedQueue<Long> DUREES = new ConcurrentLinkedQueue<>();

    private static final ObjectMapper JSON = new ObjectMapper();

    /** Réponse reçue : code, en-têtes, corps JSON (MissingNode si vide) et durée. */
    record Reponse(int code, HttpResponse<String> brute, JsonNode json, long dureeMs) {

        String entete(String nom) {
            return brute.headers().firstValue(nom).orElse(null);
        }

        String typeContenu() {
            return entete("Content-Type");
        }

        /** Identifiant du chantier créé, lu dans l'en-tête Location (…/api/chantiers/{id}). */
        long idCree() {
            String location = entete("Location");
            assertThat(location).as("en-tête Location").isNotNull();
            return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
        }
    }

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();
    private final String base;

    ClientApi(int port) {
        this.base = "http://localhost:" + port;
    }

    Reponse get(String chemin) {
        return envoyer("GET", chemin, null, Map.of());
    }

    Reponse get(String chemin, Map<String, String> entetes) {
        return envoyer("GET", chemin, null, entetes);
    }

    Reponse post(String chemin, String corps) {
        return envoyer("POST", chemin, corps, Map.of());
    }

    Reponse put(String chemin, String corps) {
        return envoyer("PUT", chemin, corps, Map.of());
    }

    Reponse patch(String chemin) {
        return envoyer("PATCH", chemin, null, Map.of());
    }

    Reponse delete(String chemin) {
        return envoyer("DELETE", chemin, null, Map.of());
    }

    Reponse envoyer(String methode, String chemin, String corps, Map<String, String> entetes) {
        HttpRequest.Builder requete = HttpRequest.newBuilder(URI.create(base + chemin))
                .timeout(Duration.ofSeconds(10))
                .method(methode, corps == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(corps));
        if (corps != null && !entetes.containsKey("Content-Type")) {
            requete.header("Content-Type", "application/json");
        }
        entetes.forEach(requete::header);
        long debut = System.nanoTime();
        try {
            HttpResponse<String> r = http.send(requete.build(),
                    HttpResponse.BodyHandlers.ofString());
            long duree = (System.nanoTime() - debut) / 1_000_000;
            DUREES.add(duree);
            String texte = r.body();
            JsonNode json = texte == null || texte.isBlank()
                    ? MissingNode.getInstance()
                    : JSON.readTree(texte);
            return new Reponse(r.statusCode(), r, json, duree);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
