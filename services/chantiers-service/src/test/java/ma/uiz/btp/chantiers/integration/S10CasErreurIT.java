package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Scénario 10 : cas d'erreur. Données invalides, chantier inexistant, requêtes mal formées et
 * contraintes d'intégrité de la table : toujours un code précis et un corps RFC 9457 en français,
 * jamais de 500, et la base reste inchangée.
 */
@Order(10)
@DisplayName("10. Cas d'erreur : données invalides, chantier inexistant, intégrité")
class S10CasErreurIT extends IntegrationBase {

    private static final long INEXISTANT = 99_999;
    private static final String BUDGET_INVALIDE =
            "Le budget doit avoir au plus 12 chiffres avant la virgule et 2 après";

    private int total() {
        Integer n = base.queryForObject("SELECT count(*) FROM chantiers", Integer.class);
        return n == null ? 0 : n;
    }

    @AfterEach
    void reinitialiserTaches() {
        TACHES.reinitialiser();
    }

    @Test
    @Order(1)
    @DisplayName("Corps vide : 400, une erreur par champ obligatoire, rien en base")
    void champsObligatoires() {
        int avant = total();
        ClientApi.Reponse r = api.post("/api/chantiers", "{}");

        erreurStandard(r, 400);
        assertThat(r.json().path("detail").asText()).isEqualTo("Données invalides");
        Map<String, String> attendus = Map.of(
                "nom", "Le nom est obligatoire",
                "adresse", "L'adresse est obligatoire",
                "client", "Le client est obligatoire",
                "dateDebut", "La date de début est obligatoire",
                "dateFinPrevue", "La date de fin prévue est obligatoire",
                "budget", "Le budget est obligatoire");
        attendus.forEach((champ, message) ->
                assertThat(r.json().path("erreurs").path(champ).asText()).as(champ)
                        .isEqualTo(message));
        assertThat(total()).isEqualTo(avant);
    }

    @Test
    @Order(2)
    @DisplayName("Fin prévue avant le début, budget négatif : 400 sur les bons champs")
    void reglesDeValidite() {
        int avant = total();
        String corps = avec(chantier("ecoleTikiouine"),
                Map.of("dateFinPrevue", "2026-01-01", "budget", -1));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        erreurStandard(r, 400);
        assertThat(r.json().path("erreurs").path("dateFinPrevue").asText())
                .isEqualTo("La date de fin prévue doit être postérieure ou égale à la date de "
                        + "début");
        assertThat(r.json().path("erreurs").path("budget").asText())
                .isEqualTo("Le budget doit être positif ou nul");
        assertThat(total()).isEqualTo(avant);
    }

    @Test
    @Order(3)
    @DisplayName("Nom de plus de 150 caractères : 400 (longueur de la colonne nom)")
    void nomTropLong() {
        String corps = avec(chantier("ecoleTikiouine"), Map.of("nom", "N".repeat(151)));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        erreurStandard(r, 400);
        assertThat(r.json().path("erreurs").path("nom").asText())
                .isEqualTo("Le nom ne doit pas dépasser 150 caractères");
    }

    @Test
    @Order(4)
    @DisplayName("JSON mal formé, date illisible, statut inconnu : 400 explicite")
    void corpsIllisibles() {
        ClientApi.Reponse malForme = api.post("/api/chantiers", "{\"nom\": ");
        erreurStandard(malForme, 400);
        assertThat(malForme.json().path("detail").asText()).contains("JSON mal formé");

        ClientApi.Reponse date = api.post("/api/chantiers",
                avec(chantier("ecoleTikiouine"), Map.of("dateDebut", "15/10/2026")));
        erreurStandard(date, 400);
        assertThat(date.json().path("erreurs").path("dateDebut").asText())
                .isEqualTo("Valeur invalide : 15/10/2026");

        ClientApi.Reponse statut = api.post("/api/chantiers",
                avec(chantier("ecoleTikiouine"), Map.of("statut", "ARCHIVE")));
        erreurStandard(statut, 400);
        assertThat(statut.json().path("erreurs").has("statut")).isTrue();
    }

    @Test
    @Order(5)
    @DisplayName("Mauvais type de contenu (text/plain) : 415 au format standard")
    void typeDeContenu() {
        ClientApi.Reponse r = api.envoyer("POST", "/api/chantiers", chantier("ecoleTikiouine"),
                Map.of("Content-Type", "text/plain"));
        erreurStandard(r, 415);
    }

    @Test
    @Order(6)
    @DisplayName("Chantier inexistant : 404 sur GET, PUT, PATCH, DELETE et avancement")
    void chantierInexistant() {
        String chemin = "/api/chantiers/" + INEXISTANT;
        ClientApi.Reponse[] reponses = {
            api.get(chemin),
            api.put(chemin, chantier("ecoleTikiouine")),
            api.patch(chemin + "/cloture"),
            api.delete(chemin),
            api.get(chemin + "/avancement")
        };
        for (ClientApi.Reponse r : reponses) {
            erreurStandard(r, 404);
            assertThat(r.json().path("detail").asText())
                    .isEqualTo("Chantier " + INEXISTANT + " introuvable");
        }
        assertThat(TACHES.appelsPour(INEXISTANT)).as("Tâches non sollicité").isZero();
    }

    @Test
    @Order(7)
    @DisplayName("Identifiant non numérique et route inconnue : 400 et 404")
    void urlInvalides() {
        ClientApi.Reponse abc = api.get("/api/chantiers/abc");
        erreurStandard(abc, 400);
        assertThat(abc.json().path("detail").asText()).contains("« id »").contains("abc");

        ClientApi.Reponse route = api.get("/api/chantierz");
        erreurStandard(route, 404);
    }

    @Test
    @Order(8)
    @DisplayName("Adresse de plus de 255 caractères : 400, pas d'erreur 500 de la base")
    void adresseTropLongue() {
        int avant = total();
        String corps = avec(chantier("ecoleTikiouine"), Map.of("adresse", "A".repeat(256)));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        erreurStandard(r, 400);
        assertThat(r.json().path("erreurs").path("adresse").asText())
                .isEqualTo("L'adresse ne doit pas dépasser 255 caractères");
        assertThat(total()).isEqualTo(avant);
    }

    @Test
    @Order(9)
    @DisplayName("Budget hors de la capacité de la colonne (14 chiffres) : 400, pas de 500")
    void budgetTropGrand() {
        int avant = total();
        String corps = avec(chantier("ecoleTikiouine"),
                Map.of("budget", new java.math.BigDecimal("1000000000000.00")));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        erreurStandard(r, 400);
        assertThat(r.json().path("erreurs").path("budget").asText()).isEqualTo(BUDGET_INVALIDE);
        assertThat(total()).isEqualTo(avant);
    }

    @Test
    @Order(10)
    @DisplayName("Budget avec plus de 2 décimales : 400, au lieu d'un arrondi silencieux en base")
    void budgetTropPrecis() {
        int avant = total();
        String corps = avec(chantier("ecoleTikiouine"),
                Map.of("budget", new java.math.BigDecimal("4200000.555")));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        erreurStandard(r, 400);
        assertThat(r.json().path("erreurs").path("budget").asText()).isEqualTo(BUDGET_INVALIDE);
        assertThat(total()).isEqualTo(avant);
    }

    @Test
    @Order(11)
    @DisplayName("Contraintes NOT NULL de la table : une insertion directe incomplète est rejetée")
    void contraintesDeLaTable() {
        assertThatThrownBy(() -> base.update(
                "INSERT INTO chantiers (nom, adresse, client, date_debut, date_fin_prevue, "
                        + "statut, created_at) VALUES ('Sans budget', 'Agadir', 'Client', "
                        + "DATE '2026-01-01', DATE '2026-12-31', 'PLANIFIE', now())"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("budget");
    }
}
