package ma.uiz.btp.materiaux.client;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import ma.uiz.btp.materiaux.domain.ChantierTermineException;
import ma.uiz.btp.materiaux.domain.ChantiersIndisponibleException;
import ma.uiz.btp.materiaux.domain.IntrouvableException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Appels au service Chantiers face à un vrai serveur HTTP local (celui du JDK). */
class ChantiersClientTest {

    private static final Duration DELAI = Duration.ofMillis(500);

    private HttpServer serveur;
    private final AtomicReference<String> chemin = new AtomicReference<>();
    private volatile int code = 200;
    private volatile String corps = "{\"id\":7,\"statut\":\"EN_COURS\"}";
    private volatile long attenteMs;

    @BeforeEach
    void demarrer() throws IOException {
        serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        serveur.createContext("/api/chantiers", echange -> {
            chemin.set(echange.getRequestURI().getPath());
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

    private ChantiersClient client() {
        return new ChantiersClient("http://127.0.0.1:" + serveur.getAddress().getPort(), DELAI);
    }

    @ParameterizedTest(name = "UT-MAT-32 : chantier {0} accepté")
    @ValueSource(strings = {"PLANIFIE", "EN_COURS", "SUSPENDU"})
    void chantierActifAccepte(String statut) {
        corps = "{\"id\":7,\"statut\":\"" + statut + "\"}";

        assertDoesNotThrow(() -> client().verifierChantierActif(7L));
        assertEquals("/api/chantiers/7", chemin.get());
    }

    @Test
    @DisplayName("UT-MAT-33 : chantier terminé refusé")
    void chantierTermine() {
        corps = "{\"id\":7,\"statut\":\"TERMINE\"}";

        ChantierTermineException e = assertThrows(ChantierTermineException.class,
                () -> client().verifierChantierActif(7L));
        assertEquals("Le chantier 7 est terminé", e.getMessage());
    }

    @Test
    @DisplayName("UT-MAT-34 : chantier inconnu (404) : introuvable")
    void chantierInconnu() {
        code = 404;
        corps = "{\"status\":404,\"detail\":\"Chantier 7 introuvable\"}";

        IntrouvableException e = assertThrows(IntrouvableException.class,
                () -> client().verifierChantierActif(7L));
        assertEquals("Chantier 7 introuvable", e.getMessage());
    }

    @ParameterizedTest(name = "UT-MAT-35 : HTTP {0} : Chantiers indisponible")
    @ValueSource(ints = {400, 401, 500, 503})
    void erreurHttpDonneIndisponible(int statut) {
        code = statut;
        corps = "{\"status\":" + statut + "}";

        assertThrows(ChantiersIndisponibleException.class, () -> client().verifierChantierActif(7L));
    }

    @ParameterizedTest(name = "UT-MAT-36 : réponse « {0} » invalide")
    @ValueSource(strings = {"{\"id\":7}", "{\"id\":7,\"statut\":\"  \"}", "null"})
    void reponseSansStatut(String reponse) {
        corps = reponse;

        ChantiersIndisponibleException e = assertThrows(ChantiersIndisponibleException.class,
                () -> client().verifierChantierActif(7L));
        assertEquals("Réponse invalide du service Chantiers pour le chantier 7", e.getMessage());
    }

    @Test
    @DisplayName("UT-MAT-37 : 200 sans corps : réponse invalide")
    void reponseVide() {
        corps = "";

        assertThrows(ChantiersIndisponibleException.class, () -> client().verifierChantierActif(7L));
    }

    @Test
    @DisplayName("UT-MAT-38 : JSON illisible : Chantiers indisponible")
    void jsonIllisible() {
        corps = "<html>erreur</html>";

        assertThrows(ChantiersIndisponibleException.class, () -> client().verifierChantierActif(7L));
    }

    @Test
    @DisplayName("UT-MAT-39 : délai dépassé : Chantiers indisponible")
    void delaiDepasse() {
        attenteMs = DELAI.toMillis() * 3;

        assertThrows(ChantiersIndisponibleException.class, () -> client().verifierChantierActif(7L));
    }

    @Test
    @DisplayName("UT-MAT-40 : Chantiers arrêté (connexion refusée) : indisponible")
    void connexionRefusee() {
        ChantiersClient client = client();
        serveur.stop(0);

        assertThrows(ChantiersIndisponibleException.class, () -> client.verifierChantierActif(7L));
    }
}
