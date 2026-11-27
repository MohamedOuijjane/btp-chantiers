package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/** Scénario 3 : consultation et modification d'un chantier. */
@Order(3)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("3. Consultation et modification d'un chantier")
class S03ModificationChantierIT extends IntegrationBase {

    private long id;

    @BeforeAll
    void chantierExistant() {
        api = new ClientApi(port);
        id = creer("villaTaghazout");
    }

    @Test
    @Order(1)
    @DisplayName("GET /api/chantiers/{id} : 200 avec tous les champs du chantier")
    void consultation() {
        ClientApi.Reponse r = api.get("/api/chantiers/" + id);
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.typeContenu()).startsWith("application/json");
        assertThat(r.json().path("id").asLong()).isEqualTo(id);
        assertThat(r.json().path("nom").asText()).isEqualTo("Villa R+1 Taghazout Bay");
        assertThat(r.json().path("adresse").asText())
                .isEqualTo("Route d'Essaouira, km 17, Taghazout");
        assertThat(r.json().path("client").asText()).isEqualTo("M. et Mme Benali");
        assertThat(r.json().path("statut").asText()).isEqualTo("PLANIFIE");
        rapide(r);
    }

    @Test
    @Order(2)
    @DisplayName("PUT /api/chantiers/{id} : budget, fin prévue et statut modifiés en base")
    void modification() {
        String corps = avec(chantier("villaTaghazout"), Map.of(
                "budget", 2_480_000.00, "dateFinPrevue", "2027-09-30", "statut", "EN_COURS"));
        ClientApi.Reponse r = api.put("/api/chantiers/" + id, corps);

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("budget").asDouble()).isEqualTo(2_480_000.00);
        assertThat(r.json().path("dateFinPrevue").asText()).isEqualTo("2027-09-30");
        assertThat(r.json().path("statut").asText()).isEqualTo("EN_COURS");
        rapide(r);

        Map<String, Object> ligne = ligne(id);
        assertThat((BigDecimal) ligne.get("budget")).isEqualByComparingTo("2480000.00");
        assertThat(ligne.get("date_fin_prevue").toString()).isEqualTo("2027-09-30");
        assertThat(ligne.get("statut")).isEqualTo("EN_COURS");
        assertThat(ligne.get("updated_at")).as("date de modification").isNotNull();
    }

    @Test
    @Order(3)
    @DisplayName("PUT sans statut : le statut en base est conservé")
    void modificationSansStatut() {
        String corps = avec(chantier("villaTaghazout"), Map.of(
                "nom", "Villa R+1 Taghazout Bay - piscine comprise",
                "budget", 2_480_000.00, "dateFinPrevue", "2027-09-30"));
        ClientApi.Reponse r = api.put("/api/chantiers/" + id, corps);

        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("statut").asText()).isEqualTo("EN_COURS");
        assertThat(ligne(id).get("nom")).isEqualTo("Villa R+1 Taghazout Bay - piscine comprise");
        assertThat(ligne(id).get("statut")).isEqualTo("EN_COURS");
    }

    @Test
    @Order(4)
    @DisplayName("Une nouvelle lecture renvoie l'état modifié (pas de cache)")
    void relecture() {
        ClientApi.Reponse r = api.get("/api/chantiers/" + id);
        assertThat(r.json().path("nom").asText())
                .isEqualTo("Villa R+1 Taghazout Bay - piscine comprise");
        assertThat(r.json().path("budget").asDouble()).isEqualTo(2_480_000.00);
        assertThat(r.json().path("statut").asText()).isEqualTo("EN_COURS");
    }
}
