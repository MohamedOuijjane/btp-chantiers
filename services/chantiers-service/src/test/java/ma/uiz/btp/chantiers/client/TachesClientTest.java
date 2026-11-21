package ma.uiz.btp.chantiers.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import ma.uiz.btp.chantiers.client.TachesClient.TacheResume;
import ma.uiz.btp.chantiers.domain.ServiceIndisponibleException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Client du module Tâches face à un vrai serveur HTTP local (celui du JDK) : réponses normales,
 * 404, erreurs, réponse illisible, délai dépassé et refus de connexion.
 */
class TachesClientTest {

    private static final Duration DELAI = Duration.ofMillis(500);

    private HttpServer serveur;
    private final AtomicReference<String> requete = new AtomicReference<>();
    private volatile int code = 200;
    private volatile String corps = "[]";
    private volatile long attenteMs;

    @BeforeEach
    void demarrer() throws IOException {
        serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        serveur.createContext("/api/taches", echange -> {
            requete.set(echange.getRequestURI().toString());
            try {
                Thread.sleep(attenteMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            byte[] octets = corps.getBytes(StandardCharsets.UTF_8);
            echange.getResponseHeaders().add("Content-Type", "application/json");
            echange.sendResponseHeaders(code, octets.length == 0 ? -1 : octets.length);
            try (OutputStream sortie = echange.getResponseBody()) {
                sortie.write(octets);
            }
        });
        serveur.start();
    }

    @AfterEach
    void arreter() {
        serveur.stop(0);
    }

    private TachesClient client() {
        return new TachesClient("http://127.0.0.1:" + serveur.getAddress().getPort(), DELAI);
    }

    @Test
    @DisplayName("200 : renvoie les tâches du chantier, identifiant entier de Tâches v2 compris")
    void renvoieLesTachesDuChantier() {
        corps = """
                [{"id":7,"chantierId":5,"titre":"Fondations","statut":"TERMINEE","avancement":100,
                  "ouvrierIds":[1],"besoinsMateriaux":[]}]
                """;

        List<TacheResume> taches = client().tachesAvantSuppression(5L);

        assertEquals(List.of(new TacheResume("7", "Fondations", "TERMINEE", 100)), taches);
        assertEquals("/api/taches?chantierId=5", requete.get());
    }

    @Test
    @DisplayName("200 avec une liste vide : aucune tâche")
    void listeVide() {
        assertTrue(client().tachesAvantSuppression(5L).isEmpty());
    }

    @Test
    @DisplayName("404 de Tâches : vaut « aucune tâche »")
    void quatreCentQuatreVautAucuneTache() {
        code = 404;
        corps = "{\"message\":\"Not Found\"}";

        assertTrue(client().tachesAvantSuppression(5L).isEmpty());
    }

    @ParameterizedTest(name = "HTTP {0} : 503, rien n'est supprimé")
    @ValueSource(ints = {500, 502, 503, 400, 401})
    void erreurDeTachesDonneServiceIndisponible(int statut) {
        code = statut;
        corps = "{\"message\":\"erreur\"}";

        ServiceIndisponibleException e = assertThrows(ServiceIndisponibleException.class,
                () -> client().tachesAvantSuppression(5L));
        assertTrue(e.getMessage().startsWith("Le module Tâches ne répond pas"));
        assertFalse(e.getMessage().contains(String.valueOf(statut)), "pas de détail technique");
    }

    @Test
    @DisplayName("Réponse illisible : 503")
    void reponseIllisible() {
        corps = "<html>pas du JSON</html>";

        assertThrows(ServiceIndisponibleException.class, () -> client().tachesAvantSuppression(5L));
    }

    @Test
    @DisplayName("200 sans corps : 503")
    void reponseVide() {
        corps = "";

        assertThrows(ServiceIndisponibleException.class, () -> client().tachesAvantSuppression(5L));
    }

    @Test
    @DisplayName("Délai dépassé : 503")
    void delaiDepasse() {
        attenteMs = DELAI.toMillis() * 3;

        assertThrows(ServiceIndisponibleException.class, () -> client().tachesAvantSuppression(5L));
    }

    @Test
    @DisplayName("Tâches arrêté (connexion refusée) : 503")
    void connexionRefusee() {
        TachesClient client = client();
        serveur.stop(0);

        assertThrows(ServiceIndisponibleException.class, () -> client.tachesAvantSuppression(5L));
    }

    @Test
    @DisplayName("Avancement : le mode dégradé existant est inchangé (vide si Tâches est en erreur)")
    void avancementDegradeInchange() {
        code = 500;

        assertTrue(client().tachesDuChantier(5L).isEmpty());
    }
}
