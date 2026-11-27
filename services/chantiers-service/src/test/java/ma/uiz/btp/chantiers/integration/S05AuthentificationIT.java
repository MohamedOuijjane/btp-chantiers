package ma.uiz.btp.chantiers.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/**
 * Scénario 5 : authentification JWT. Chantiers émet le jeton (POST /api/auth/login) et la gateway
 * le fait vérifier par Chantiers (GET /api/auth/verifier) avant toute requête vers les modules.
 */
@Order(5)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("5. Authentification JWT et vérification du jeton pour la gateway")
class S05AuthentificationIT extends IntegrationBase {

    private static final String EMAIL = "samir.haddou@souss-batiment.demo";

    private String jeton;

    private static String identifiants(String email, String motDePasse) {
        return "{\"email\":\"" + email + "\",\"motDePasse\":\"" + motDePasse + "\"}";
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/auth/login : 200, jeton et profil CONDUCTEUR (comptes du schéma auth)")
    void connexion() {
        ClientApi.Reponse r = api.post("/api/auth/login", identifiants(EMAIL, MOT_DE_PASSE_DEMO));
        assertThat(r.code()).isEqualTo(200);
        jeton = r.json().path("token").asText();
        assertThat(jeton.split("\\.")).as("JWT en 3 parties").hasSize(3);
        assertThat(r.json().path("utilisateur").path("email").asText()).isEqualTo(EMAIL);
        assertThat(r.json().path("utilisateur").path("nom").asText()).isEqualTo("Samir Haddou");
        assertThat(r.json().path("utilisateur").path("role").asText()).isEqualTo("CONDUCTEUR");
        rapide(r);
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/auth/verifier (appel de la gateway) : 200 et en-têtes X-Utilisateur, X-Role")
    void verificationParLaGateway() {
        ClientApi.Reponse r = api.get("/api/auth/verifier",
                Map.of("Authorization", "Bearer " + jeton));
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.entete("X-Utilisateur")).isEqualTo(EMAIL);
        assertThat(r.entete("X-Role")).isEqualTo("CONDUCTEUR");
        assertThat(r.entete("X-Utilisateur-Id")).isNotBlank();
        rapide(r);
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/auth/moi : l'utilisateur décrit par le jeton")
    void utilisateurDuJeton() {
        ClientApi.Reponse r = api.get("/api/auth/moi", Map.of("Authorization", "Bearer " + jeton));
        assertThat(r.code()).isEqualTo(200);
        assertThat(r.json().path("email").asText()).isEqualTo(EMAIL);
        assertThat(r.json().path("initiales").asText()).isEqualTo("SH");
    }

    @Test
    @Order(4)
    @DisplayName("Sans jeton ou avec un jeton falsifié : 401 au format RFC 9457")
    void jetonAbsentOuFalsifie() {
        ClientApi.Reponse sans = api.get("/api/auth/verifier");
        erreurStandard(sans, 401);
        assertThat(sans.entete("WWW-Authenticate")).startsWith("Bearer");

        String falsifie = jeton.substring(0, jeton.length() - 4) + "AAAA";
        ClientApi.Reponse r = api.get("/api/auth/verifier",
                Map.of("Authorization", "Bearer " + falsifie));
        erreurStandard(r, 401);
        assertThat(r.json().path("detail").asText()).contains("jeton absent, invalide ou expiré");
    }

    @Test
    @Order(5)
    @DisplayName("Mauvais mot de passe : 401, même message qu'un e-mail inconnu")
    void identifiantsInvalides() {
        ClientApi.Reponse faux = api.post("/api/auth/login", identifiants(EMAIL, "mauvais"));
        erreurStandard(faux, 401);
        ClientApi.Reponse inconnu = api.post("/api/auth/login",
                identifiants("inconnu@souss-batiment.demo", "mauvais"));
        erreurStandard(inconnu, 401);
        assertThat(faux.json().path("detail").asText())
                .isEqualTo("Adresse e-mail ou mot de passe incorrect.")
                .isEqualTo(inconnu.json().path("detail").asText());
    }

    @Test
    @Order(6)
    @DisplayName("Appels internes des modules (sans jeton) vers /api/chantiers acceptés")
    void appelsInternesSansJeton() {
        ClientApi.Reponse r = api.get("/api/chantiers");
        assertThat(r.code()).isEqualTo(200);
    }
}
