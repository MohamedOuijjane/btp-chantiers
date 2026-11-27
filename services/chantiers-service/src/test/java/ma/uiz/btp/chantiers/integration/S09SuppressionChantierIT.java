package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;

/**
 * Scénario 9 : suppression d'un chantier. Chantiers interroge Tâches avant de supprimer : un
 * chantier qui a des tâches (même terminées) est conservé, sinon elles deviendraient orphelines.
 */
@Order(9)
@DisplayName("9. Suppression d'un chantier avec ou sans tâches liées")
class S09SuppressionChantierIT extends IntegrationBase {

    @AfterEach
    void reinitialiserTaches() {
        TACHES.reinitialiser();
    }

    @Test
    @Order(1)
    @DisplayName("Chantier avec 7 tâches : 409, 5 titres cités, chantier conservé en base")
    void refusSiTachesLiees() {
        long id = creerAuStatut("immeubleTalborjt", "EN_COURS");
        TACHES.taches(id, taches("immeubleTalborjt"));

        ClientApi.Reponse r = api.delete("/api/chantiers/" + id);

        erreurStandard(r, 409);
        assertThat(r.json().path("detail").asText())
                .startsWith("Suppression impossible : le chantier « Immeuble R+4 Talborjt » a 7 "
                        + "tâche(s)")
                .contains("« Installation de chantier »", "« Plancher haut sous-sol »")
                .doesNotContain("« Gros œuvre R+1 »", "« Gros œuvre R+2 »")
                .contains("et 2 autre(s)")
                .endsWith("Supprimez ses tâches dans le module Tâches avant de supprimer le "
                        + "chantier.");
        assertThat(nombreDeLignes(id)).as("chantier toujours en base").isEqualTo(1);
        assertThat(TACHES.appelsPour(id)).isEqualTo(1);
    }

    @Test
    @Order(2)
    @DisplayName("Chantier dont toutes les tâches sont terminées : suppression refusée aussi")
    void refusMemeSiTachesTerminees() {
        long id = creer("centreSanteInezgane");
        TACHES.taches(id, "[{\"id\":\"401\",\"titre\":\"Peinture\",\"statut\":\"TERMINEE\","
                + "\"avancement\":100}]");

        ClientApi.Reponse r = api.delete("/api/chantiers/" + id);

        erreurStandard(r, 409);
        assertThat(r.json().path("detail").asText()).contains("1 tâche(s) : « Peinture »");
        assertThat(nombreDeLignes(id)).isEqualTo(1);
    }

    @Test
    @Order(3)
    @DisplayName("Chantier sans tâche : 204, ligne supprimée, puis 404 à la lecture")
    void suppressionSansTache() {
        long id = creer("villaTaghazout");

        ClientApi.Reponse r = api.delete("/api/chantiers/" + id);

        assertThat(r.code()).isEqualTo(204);
        assertThat(r.brute().body()).isEmpty();
        rapide(r);
        assertThat(nombreDeLignes(id)).isZero();
        assertThat(api.get("/api/chantiers/" + id).code()).isEqualTo(404);
        assertThat(api.get("/api/chantiers").json().findValuesAsText("id"))
                .doesNotContain(String.valueOf(id));
    }

    @Test
    @Order(4)
    @DisplayName("Tâches répond 404 pour ce chantier : « aucune tâche », suppression acceptée")
    void tachesRepond404() {
        long id = creer("voirieDrarga");
        TACHES.erreur(id, 404);

        assertThat(api.delete("/api/chantiers/" + id).code()).isEqualTo(204);
        assertThat(nombreDeLignes(id)).isZero();
    }

    @Test
    @Order(5)
    @DisplayName("Tâches en panne (500) : 503, rien n'est supprimé")
    void tachesEnPanne() {
        long id = creer("ecoleTikiouine");
        TACHES.erreur(id, 500);

        ClientApi.Reponse r = api.delete("/api/chantiers/" + id);

        erreurStandard(r, 503);
        assertThat(r.json().path("detail").asText())
                .startsWith("Le module Tâches ne répond pas")
                .contains("suppression annulée");
        assertThat(nombreDeLignes(id)).isEqualTo(1);
    }

    @Test
    @Order(6)
    @DisplayName("Tâches trop lent (timeout) : 503 sous 2 s, rien n'est supprimé")
    void tachesTropLent() {
        long id = creer("residenceAlAmal");
        TACHES.lent(id, 1500);

        ClientApi.Reponse r = api.delete("/api/chantiers/" + id);

        erreurStandard(r, 503);
        assertThat(nombreDeLignes(id)).isEqualTo(1);
    }
}
