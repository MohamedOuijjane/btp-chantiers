package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/**
 * Scénario 6 : changements de statut et clôture d'un chantier. Le statut est lu par le module
 * Tâches avant chaque création ou modification de tâche : il doit être exact en base et dans
 * l'API à chaque étape.
 */
@Order(6)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("6. Changement de statut et clôture d'un chantier")
class S06CycleDeVieStatutIT extends IntegrationBase {

    private long id;
    private String corps;

    @BeforeAll
    void chantierPlanifie() {
        api = new ClientApi(port);
        id = creer("hangarAitMelloul");
        corps = chantier("hangarAitMelloul");
    }

    private ClientApi.Reponse passerA(String statut) {
        return api.put("/api/chantiers/" + id, avec(corps, Map.of("statut", statut)));
    }

    @Test
    @Order(1)
    @DisplayName("PLANIFIE → EN_COURS → SUSPENDU → EN_COURS : chaque statut est enregistré")
    void transitionsAutorisees() {
        for (String statut : new String[] {"EN_COURS", "SUSPENDU", "EN_COURS"}) {
            ClientApi.Reponse r = passerA(statut);
            assertThat(r.code()).as(statut).isEqualTo(200);
            assertThat(r.json().path("statut").asText()).isEqualTo(statut);
            assertThat(ligne(id).get("statut")).as("statut en base").isEqualTo(statut);
            assertThat(api.get("/api/chantiers/" + id).json().path("statut").asText())
                    .as("statut lu par Tâches").isEqualTo(statut);
            rapide(r);
        }
    }

    @Test
    @Order(2)
    @DisplayName("PUT avec statut TERMINE : 409, la clôture passe par PATCH …/cloture")
    void termineInterditParModification() {
        ClientApi.Reponse r = passerA("TERMINE");
        erreurStandard(r, 409);
        assertThat(r.json().path("detail").asText())
                .contains("PATCH /api/chantiers/" + id + "/cloture");
        assertThat(ligne(id).get("statut")).isEqualTo("EN_COURS");
    }

    @Test
    @Order(3)
    @DisplayName("PATCH /api/chantiers/{id}/cloture : 200 et statut TERMINE en base")
    void cloture() {
        ClientApi.Reponse r = api.patch("/api/chantiers/" + id + "/cloture");
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("statut").asText()).isEqualTo("TERMINE");
        assertThat(ligne(id).get("statut")).isEqualTo("TERMINE");
        rapide(r);
    }

    @Test
    @Order(4)
    @DisplayName("Chantier clôturé : modification et seconde clôture refusées (409), base inchangée")
    void chantierClotureFige() {
        String nomAvant = (String) ligne(id).get("nom");

        ClientApi.Reponse modif = api.put("/api/chantiers/" + id,
                avec(corps, Map.of("nom", "Nouveau nom", "statut", "EN_COURS")));
        erreurStandard(modif, 409);
        assertThat(modif.json().path("detail").asText())
                .isEqualTo("Le chantier " + id + " est terminé et ne peut plus être modifié.");

        ClientApi.Reponse reCloture = api.patch("/api/chantiers/" + id + "/cloture");
        erreurStandard(reCloture, 409);

        assertThat(ligne(id).get("nom")).isEqualTo(nomAvant);
        assertThat(ligne(id).get("statut")).isEqualTo("TERMINE");
    }

    @Test
    @Order(5)
    @DisplayName("Le chantier clôturé reste consultable : Tâches lit TERMINE et refuse les tâches")
    void clotureVisibleDesAutresModules() {
        ClientApi.Reponse r = api.get("/api/chantiers/" + id);
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("statut").asText()).isEqualTo("TERMINE");
        assertThat(api.get("/api/chantiers?statut=TERMINE").json().findValuesAsText("id"))
                .contains(String.valueOf(id));
    }
}
