package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/** Scénario 2 : création d'un chantier, persistance en base puis affichage dans la liste. */
@Order(2)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("2. Création d'un chantier, persistance en base et affichage dans la liste")
class S02CreationChantierIT extends IntegrationBase {

    private long id;

    @BeforeAll
    void baseVide() {
        viderChantiers();
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/chantiers : 201, en-tête Location et statut PLANIFIE")
    void creation() {
        ClientApi.Reponse r = api.post("/api/chantiers", chantier("residenceAlAmal"));

        assertThat(r.code()).isEqualTo(201);
        id = r.idCree();
        assertThat(r.entete("Location")).endsWith("/api/chantiers/" + id);
        assertThat(r.json().path("id").asLong()).isEqualTo(id);
        assertThat(r.json().path("nom").asText()).isEqualTo("Résidence Al Amal - 48 logements");
        assertThat(r.json().path("client").asText()).isEqualTo("Al Omrane Souss-Massa");
        assertThat(r.json().path("dateDebut").asText()).isEqualTo("2026-09-01");
        assertThat(r.json().path("dateFinPrevue").asText()).isEqualTo("2027-12-31");
        assertThat(r.json().path("budget").asDouble()).isEqualTo(18_500_000.00);
        assertThat(r.json().path("statut").asText()).isEqualTo("PLANIFIE");
        rapide(r);
    }

    @Test
    @Order(2)
    @DisplayName("La ligne est enregistrée dans chantiers.chantiers avec les mêmes valeurs")
    void persistance() {
        Map<String, Object> ligne = ligne(id);
        assertThat(ligne.get("nom")).isEqualTo("Résidence Al Amal - 48 logements");
        assertThat(ligne.get("adresse"))
                .isEqualTo("Lotissement Al Amal, lot 112, Hay Mohammadi, Agadir");
        assertThat(ligne.get("statut")).isEqualTo("PLANIFIE");
        assertThat((BigDecimal) ligne.get("budget")).isEqualByComparingTo("18500000.00");
        assertThat(((java.sql.Date) ligne.get("date_debut")).toLocalDate())
                .isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(ligne.get("created_at")).isNotNull();
        assertThat(ligne.get("updated_at")).isNull();
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/chantiers : le chantier créé apparaît dans la liste")
    void affichageDansLaListe() {
        ClientApi.Reponse r = api.get("/api/chantiers");
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().isArray()).isTrue();
        assertThat(r.json().findValuesAsText("nom"))
                .containsExactly("Résidence Al Amal - 48 logements");
        assertThat(r.json().get(0).path("id").asLong()).isEqualTo(id);
        rapide(r);
    }

    @Test
    @Order(4)
    @DisplayName("Le statut envoyé à la création est ignoré : toujours PLANIFIE")
    void statutImposeALaCreation() {
        String corps = avec(chantier("ecoleTikiouine"), Map.of("statut", "TERMINE"));
        ClientApi.Reponse r = api.post("/api/chantiers", corps);

        assertThat(r.code()).isEqualTo(201);
        assertThat(r.json().path("statut").asText()).isEqualTo("PLANIFIE");
        assertThat(ligne(r.idCree()).get("statut")).isEqualTo("PLANIFIE");
    }

    @Test
    @Order(5)
    @DisplayName("Plusieurs créations : la liste et la base comptent le même nombre de chantiers")
    void listeEtBaseCoherentes() {
        creer("villaTaghazout");
        creer("hangarAitMelloul");

        ClientApi.Reponse r = api.get("/api/chantiers");
        Integer enBase = base.queryForObject("SELECT count(*) FROM chantiers", Integer.class);
        assertThat(r.json().size()).isEqualTo(4).isEqualTo(enBase);
        assertThat(r.json().findValuesAsText("nom")).contains(
                "Villa R+1 Taghazout Bay", "Hangar logistique Aït Melloul");
    }
}
