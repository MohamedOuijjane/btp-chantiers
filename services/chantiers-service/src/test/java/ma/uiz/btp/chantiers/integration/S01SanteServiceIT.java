package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;

/** Scénario 1 : santé du service et de la base de données (health checks). */
@Order(1)
@DisplayName("1. Santé du service Chantiers et de la base btp_db")
class S01SanteServiceIT extends IntegrationBase {

    @Test
    @Order(1)
    @DisplayName("GET /actuator/health répond UP")
    void santeGlobale() {
        ClientApi.Reponse r = api.get("/actuator/health");
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("status").asText()).isEqualTo("UP");
        rapide(r);
    }

    @Test
    @Order(2)
    @DisplayName("Sondes liveness et readiness (healthcheck Docker) à UP")
    void sondes() {
        for (String sonde : new String[] {"liveness", "readiness"}) {
            ClientApi.Reponse r = api.get("/actuator/health/" + sonde);
            assertThat(r.code()).as(sonde).isEqualTo(200);
            assertThat(r.json().path("status").asText()).as(sonde).isEqualTo("UP");
            rapide(r);
        }
    }

    @Test
    @Order(3)
    @DisplayName("Table chantiers créée dans le schéma chantiers, migrations auth appliquées")
    void schemaEnPlace() {
        String schema = base.queryForObject("SELECT table_schema FROM information_schema.tables"
                + " WHERE table_name = 'chantiers'", String.class);
        assertThat(schema).isEqualTo("chantiers");
        String utilisateur = base.queryForObject("SELECT current_user", String.class);
        assertThat(utilisateur).isEqualTo("chantiers_user");
    }

    @Test
    @Order(4)
    @DisplayName("Isolation : chantiers_user n'a aucun droit sur les schémas des autres modules")
    void isolationDesSchemas() {
        for (String table : new String[] {"auth.utilisateurs", "taches.tache",
                                           "ouvriers.ouvriers", "materiaux.materiau"}) {
            assertThatThrownBy(() -> base.queryForList("SELECT * FROM " + table))
                    .as(table)
                    .isInstanceOf(DataAccessException.class)
                    .hasStackTraceContaining("permission denied for schema");
        }
    }

    @Test
    @Order(5)
    @DisplayName("Contrat OpenAPI publié avec les routes /api/chantiers")
    void contratOpenApi() {
        ClientApi.Reponse r = api.get("/v3/api-docs");
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("paths").has("/api/chantiers")).isTrue();
        assertThat(r.json().path("paths").has("/api/chantiers/{id}/avancement")).isTrue();
        rapide(r);
    }
}
