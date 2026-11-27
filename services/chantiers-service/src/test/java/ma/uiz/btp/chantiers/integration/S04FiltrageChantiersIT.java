package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Scénario 4 : recherche et filtrage des chantiers par statut. */
@Order(4)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("4. Recherche et filtrage des chantiers par statut")
class S04FiltrageChantiersIT extends IntegrationBase {

    /** Portefeuille Souss Bâtiment : 7 chantiers répartis sur les 4 statuts. */
    @BeforeAll
    void portefeuille() {
        viderChantiers();
        api = new ClientApi(port);
        creerAuStatut("residenceAlAmal", "EN_COURS");
        creerAuStatut("ecoleTikiouine", "PLANIFIE");
        creerAuStatut("villaTaghazout", "PLANIFIE");
        creerAuStatut("hangarAitMelloul", "EN_COURS");
        creerAuStatut("centreSanteInezgane", "TERMINE");
        creerAuStatut("voirieDrarga", "PLANIFIE");
        creerAuStatut("immeubleTalborjt", "SUSPENDU");
    }

    @Test
    @Order(1)
    @DisplayName("Sans filtre : les 7 chantiers")
    void sansFiltre() {
        ClientApi.Reponse r = api.get("/api/chantiers");
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().size()).isEqualTo(7);
        rapide(r);
    }

    @ParameterizedTest(name = "?statut={0} : {1} chantier(s)")
    @Order(2)
    @CsvSource({"PLANIFIE, 3", "EN_COURS, 2", "SUSPENDU, 1", "TERMINE, 1"})
    @DisplayName("Filtre par statut : uniquement les chantiers de ce statut")
    void filtreParStatut(String statut, int attendu) {
        ClientApi.Reponse r = api.get("/api/chantiers?statut=" + statut);
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().size()).isEqualTo(attendu);
        assertThat(r.json().findValuesAsText("statut")).containsOnly(statut);
        rapide(r);
    }

    @Test
    @Order(3)
    @DisplayName("EN_COURS : la résidence Al Amal et le hangar d'Aït Melloul")
    void contenuDuFiltre() {
        ClientApi.Reponse r = api.get("/api/chantiers?statut=EN_COURS");
        assertThat(r.json().findValuesAsText("nom")).containsExactlyInAnyOrder(
                "Résidence Al Amal - 48 logements", "Hangar logistique Aït Melloul");
    }

    @Test
    @Order(4)
    @DisplayName("La répartition par statut de l'API est celle de la base")
    void coherenceAvecLaBase() {
        Map<String, Integer> enBase = new HashMap<>();
        base.query("SELECT statut, count(*) AS n FROM chantiers GROUP BY statut",
                rs -> {
                    enBase.put(rs.getString("statut"), rs.getInt("n"));
                });
        for (Map.Entry<String, Integer> e : enBase.entrySet()) {
            ClientApi.Reponse r = api.get("/api/chantiers?statut=" + e.getKey());
            assertThat(r.json().size()).as(e.getKey()).isEqualTo(e.getValue());
        }
        assertThat(enBase.values().stream().mapToInt(Integer::intValue).sum()).isEqualTo(7);
    }

    @Test
    @Order(5)
    @DisplayName("Statut inconnu : 400 avec la liste des valeurs possibles")
    void statutInconnu() {
        ClientApi.Reponse r = api.get("/api/chantiers?statut=ARCHIVE");
        erreurStandard(r, 400);
        assertThat(r.json().path("detail").asText())
                .contains("statut")
                .contains("PLANIFIE, EN_COURS, SUSPENDU, TERMINE");
    }
}
