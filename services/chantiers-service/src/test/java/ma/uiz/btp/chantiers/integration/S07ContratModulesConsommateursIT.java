package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Scénario 7 : vérification d'un chantier avant une affectation. Le module Tâches (affectation de
 * tâches et d'ouvriers) et le module Matériaux (sortie de stock vers un chantier) appellent
 * GET /api/chantiers/{id} sans jeton et décident à partir du champ statut :
 *
 * <ul>
 *   <li>Tâches (ChantiersClient.verifierChantierActif) : refuse SUSPENDU et TERMINE (409) ;
 *   <li>Matériaux (ChantiersClient.verifierChantierActif) : refuse TERMINE (SOAP Fault) ;
 *   <li>les deux traduisent un 404 en « chantier introuvable ».
 * </ul>
 *
 * <p>Le test vérifie, côté fournisseur, ce que ces deux clients lisent réellement.
 */
@Order(7)
@DisplayName("7. Vérification d'un chantier par Tâches et Matériaux avant une affectation")
class S07ContratModulesConsommateursIT extends IntegrationBase {

    private static final Set<String> STATUTS = Set.of("PLANIFIE", "EN_COURS", "SUSPENDU",
            "TERMINE");

    /** Décision prise par le module Tâches à partir du statut reçu. */
    private static boolean tachesAccepte(String statut) {
        return !"SUSPENDU".equals(statut) && !"TERMINE".equals(statut);
    }

    /** Décision prise par le module Matériaux à partir du statut reçu. */
    private static boolean materiauxAccepte(String statut) {
        return !"TERMINE".equals(statut);
    }

    @ParameterizedTest(name = "{0} : Tâches accepte = {1}, Matériaux accepte = {2}")
    @Order(1)
    @CsvSource({
        "PLANIFIE, true, true",
        "EN_COURS, true, true",
        "SUSPENDU, false, true",
        "TERMINE, false, false"
    })
    @DisplayName("Le statut renvoyé conduit Tâches et Matériaux à la bonne décision")
    void decisionDesConsommateurs(String statut, boolean tachesOk, boolean materiauxOk) {
        long id = creerAuStatut("ecoleTikiouine", statut);

        ClientApi.Reponse r = api.get("/api/chantiers/" + id);

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.typeContenu()).startsWith("application/json");
        JsonNode c = r.json();
        assertThat(c.path("id").isIntegralNumber()).as("id numérique (Matériaux)").isTrue();
        assertThat(c.path("id").asLong()).isEqualTo(id);
        assertThat(c.path("nom").asText()).as("nom cité dans le refus de Tâches").isNotBlank();
        assertThat(c.path("statut").asText()).isIn(STATUTS).isEqualTo(statut);
        assertThat(tachesAccepte(c.path("statut").asText())).isEqualTo(tachesOk);
        assertThat(materiauxAccepte(c.path("statut").asText())).isEqualTo(materiauxOk);
        assertThat(r.dureeMs()).as("sous le timeout de 2 s des clients").isLessThan(2000);
    }

    @Test
    @Order(2)
    @DisplayName("Chantier inconnu : exactement 404 (« introuvable » pour Tâches et Matériaux)")
    void chantierInconnu() {
        ClientApi.Reponse r = api.get("/api/chantiers/987654");
        erreurStandard(r, 404);
        assertThat(r.json().path("detail").asText()).isEqualTo("Chantier 987654 introuvable");
    }

    @Test
    @Order(3)
    @DisplayName("Appel interne sans jeton ni en-tête de la gateway : accepté")
    void appelSansJeton() {
        long id = creer("voirieDrarga");
        ClientApi.Reponse r = api.get("/api/chantiers/" + id);
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.entete("WWW-Authenticate")).isNull();
    }
}
