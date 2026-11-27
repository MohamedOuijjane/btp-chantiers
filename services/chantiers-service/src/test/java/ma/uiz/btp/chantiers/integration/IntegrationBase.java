package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Socle des tests d'intégration du module Chantiers.
 *
 * <ul>
 *   <li>Base : vraie PostgreSQL 16 (Testcontainers), initialisée par scripts/init-postgres.sh,
 *       le même script qu'en production : base btp_db, un schéma et un utilisateur par module.
 *       Chantiers s'y connecte avec chantiers_user (schéma chantiers) et auth_user (schéma auth).
 *   <li>Configuration : celle de production (src/main/resources/application.yml), complétée par
 *       integration/application-integration.yml (secret JWT de test, timeout).
 *   <li>Service : démarré sur un port aléatoire, appelé par de vraies requêtes HTTP.
 *   <li>Module Tâches : serveur HTTP local ({@link ModuleTachesSimule}).
 * </ul>
 *
 * <p>Le conteneur et le contexte Spring sont partagés par toutes les classes de scénarios.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, args = {
    "--spring.config.location=file:src/main/resources/application.yml,"
            + "classpath:/integration/application-integration.yml"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
abstract class IntegrationBase {

    static final String MOT_DE_PASSE_DEMO = "SoussBatiment-2026";
    static final String PROBLEM_JSON = MediaType.APPLICATION_PROBLEM_JSON_VALUE;

    static final PostgreSQLContainer<?> POSTGRES;
    static final ModuleTachesSimule TACHES = new ModuleTachesSimule();
    private static final JsonNode JEU_DE_DONNEES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("btp_db")
                .withUsername("btp")
                .withPassword("btp")
                .withCopyFileToContainer(
                        MountableFile.forHostPath(Path.of("../../scripts/init-postgres.sh")),
                        "/docker-entrypoint-initdb.d/init.sh");
        POSTGRES.start();
        try (InputStream in = IntegrationBase.class.getResourceAsStream(
                "/integration/souss-batiment.json")) {
            JEU_DE_DONNEES = new ObjectMapper().readTree(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        Runtime.getRuntime().addShutdownHook(new Thread(TACHES::arreter));
    }

    @DynamicPropertySource
    static void connexions(DynamicPropertyRegistry registre) {
        String base = "jdbc:postgresql://" + POSTGRES.getHost() + ":"
                + POSTGRES.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT) + "/btp_db";
        registre.add("spring.datasource.url", () -> base + "?currentSchema=chantiers");
        registre.add("spring.datasource.username", () -> "chantiers_user");
        registre.add("spring.datasource.password", () -> "chantiers");
        registre.add("auth.datasource.url", () -> base + "?currentSchema=auth");
        registre.add("auth.datasource.username", () -> "auth_user");
        registre.add("auth.datasource.password", () -> "auth");
        registre.add("services.taches.url", TACHES::url);
    }

    @LocalServerPort
    int port;

    /** Connexion chantiers_user : sert à vérifier l'état réel de la table chantiers. */
    @Autowired
    JdbcTemplate base;

    ClientApi api;

    @BeforeEach
    void preparerClient() {
        api = new ClientApi(port);
    }

    /** Chantier du jeu de données Souss Bâtiment, au format du corps de POST et PUT. */
    static String chantier(String cle) {
        JsonNode c = JEU_DE_DONNEES.path("chantiers").path(cle);
        assertThat(c.isMissingNode()).as("chantier « %s » du jeu de données", cle).isFalse();
        return c.toString();
    }

    /** Tâches du jeu de données (format renvoyé par le module Tâches). */
    static String taches(String cle) {
        JsonNode t = JEU_DE_DONNEES.path("taches").path(cle);
        assertThat(t.isMissingNode()).as("tâches « %s » du jeu de données", cle).isFalse();
        return t.toString();
    }

    /** Remplace des champs du corps JSON (données de test dérivées). */
    static String avec(String json, Map<String, Object> champs) {
        try {
            ObjectMapper m = new ObjectMapper();
            var noeud = (com.fasterxml.jackson.databind.node.ObjectNode) m.readTree(json);
            champs.forEach((k, v) -> noeud.set(k, m.valueToTree(v)));
            return noeud.toString();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Crée le chantier du jeu de données et renvoie son identifiant. */
    long creer(String cle) {
        ClientApi.Reponse r = api.post("/api/chantiers", chantier(cle));
        assertThat(r.code()).as("création de « %s »", cle).isEqualTo(201);
        return r.idCree();
    }

    /** Crée un chantier et l'amène au statut demandé (PUT, ou clôture pour TERMINE). */
    long creerAuStatut(String cle, String statut) {
        long id = creer(cle);
        if ("TERMINE".equals(statut)) {
            assertThat(api.patch("/api/chantiers/" + id + "/cloture").code()).isEqualTo(200);
        } else if (!"PLANIFIE".equals(statut)) {
            String corps = avec(chantier(cle), Map.of("statut", statut));
            assertThat(api.put("/api/chantiers/" + id, corps).code()).isEqualTo(200);
        }
        return id;
    }

    /** Ligne de la table chantiers.chantiers, lue directement en base. */
    Map<String, Object> ligne(long id) {
        return base.queryForMap("SELECT * FROM chantiers WHERE id = ?", id);
    }

    int nombreDeLignes(long id) {
        Integer n = base.queryForObject("SELECT count(*) FROM chantiers WHERE id = ?",
                Integer.class, id);
        return n == null ? 0 : n;
    }

    void viderChantiers() {
        base.execute("TRUNCATE TABLE chantiers RESTART IDENTITY");
    }

    /** Critères communs : temps de réponse et, pour une erreur, format RFC 9457 en français. */
    static void rapide(ClientApi.Reponse r) {
        assertThat(r.dureeMs()).as("temps de réponse (ms)").isLessThan(ClientApi.SEUIL_MS);
    }

    static void erreurStandard(ClientApi.Reponse r, int code) {
        assertThat(r.code()).isEqualTo(code);
        assertThat(r.typeContenu()).startsWith(PROBLEM_JSON);
        assertThat(r.json().path("status").asInt()).isEqualTo(code);
        assertThat(r.json().path("title").asText()).isNotBlank();
        assertThat(r.json().path("detail").asText()).isNotBlank();
        rapide(r);
    }
}
