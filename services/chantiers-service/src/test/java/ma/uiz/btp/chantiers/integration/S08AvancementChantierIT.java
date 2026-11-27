package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;

/**
 * Scénario 8 : avancement global d'un chantier, agrégé depuis le module Tâches
 * (GET /api/taches?chantierId=), avec mode dégradé si Tâches est en panne ou trop lent.
 */
@Order(8)
@DisplayName("8. Avancement global agrégé depuis le module Tâches")
class S08AvancementChantierIT extends IntegrationBase {

    @AfterEach
    void reinitialiserTaches() {
        TACHES.reinitialiser();
    }

    @Test
    @Order(1)
    @DisplayName("4 tâches (100, 60, 25, 0 %) : avancement 46,3 %, source disponible")
    void moyenneDesTaches() {
        long id = creerAuStatut("residenceAlAmal", "EN_COURS");
        TACHES.taches(id, taches("residenceAlAmal"));

        ClientApi.Reponse r = api.get("/api/chantiers/" + id + "/avancement");

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("chantierId").asLong()).isEqualTo(id);
        assertThat(r.json().path("nombreTaches").asInt()).isEqualTo(4);
        assertThat(r.json().path("avancementGlobal").asDouble()).isEqualTo(46.3);
        assertThat(r.json().path("sourceDisponible").asBoolean()).isTrue();
        assertThat(TACHES.appelsPour(id)).as("appels reçus par Tâches").isEqualTo(1);
        rapide(r);
    }

    @Test
    @Order(2)
    @DisplayName("2 tâches (40 et 100 %) : avancement 70,0 %")
    void deuxTaches() {
        long id = creerAuStatut("hangarAitMelloul", "EN_COURS");
        TACHES.taches(id, taches("hangarAitMelloul"));

        ClientApi.Reponse r = api.get("/api/chantiers/" + id + "/avancement");

        assertThat(r.json().path("nombreTaches").asInt()).isEqualTo(2);
        assertThat(r.json().path("avancementGlobal").asDouble()).isEqualTo(70.0);
    }

    @Test
    @Order(3)
    @DisplayName("Aucune tâche : 0 tâche, avancement 0 %, source disponible")
    void aucuneTache() {
        long id = creer("voirieDrarga");

        ClientApi.Reponse r = api.get("/api/chantiers/" + id + "/avancement");

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("nombreTaches").asInt()).isZero();
        assertThat(r.json().path("avancementGlobal").asDouble()).isZero();
        assertThat(r.json().path("sourceDisponible").asBoolean()).isTrue();
    }

    @Test
    @Order(4)
    @DisplayName("Tâches en erreur (500) : 200 en mode dégradé, avancement null")
    void tachesEnErreur() {
        long id = creer("immeubleTalborjt");
        TACHES.erreur(id, 500);

        ClientApi.Reponse r = api.get("/api/chantiers/" + id + "/avancement");

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("sourceDisponible").asBoolean()).isFalse();
        assertThat(r.json().path("nombreTaches").asInt()).isZero();
        assertThat(r.json().has("avancementGlobal")).as("champ toujours présent").isTrue();
        assertThat(r.json().path("avancementGlobal").isNull()).isTrue();
        rapide(r);
    }

    @Test
    @Order(5)
    @DisplayName("Tâches trop lent (1,5 s > timeout 1 s) : mode dégradé, réponse sous 2 s")
    void tachesTropLent() {
        long id = creer("centreSanteInezgane");
        TACHES.lent(id, 1500);

        ClientApi.Reponse r = api.get("/api/chantiers/" + id + "/avancement");

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("sourceDisponible").asBoolean()).isFalse();
        rapide(r);
    }
}
