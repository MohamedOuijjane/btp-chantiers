package ma.uiz.btp.chantiers.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import ma.uiz.btp.chantiers.client.TachesClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Connexion, jeton et vérification par la gateway (ADR-0006). */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    /** Mot de passe des comptes de démo dans src/test/resources/application.yml. */
    private static final String MOT_DE_PASSE = "mot-de-passe-de-test";
    private static final String CONDUCTEUR = "samir.haddou@souss-batiment.demo";
    private static final String MAGASINIER = "fatima.idrissi@souss-batiment.demo";
    private static final String MESSAGE_REFUS = "Adresse e-mail ou mot de passe incorrect.";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtEncoder encodeur;
    @MockBean TachesClient tachesClient;

    private static final java.util.concurrent.atomic.AtomicInteger ADRESSES =
            new java.util.concurrent.atomic.AtomicInteger();

    /** Chaque appel a sa propre adresse IP, pour ne pas partager le compteur d'échecs. */
    private static String nouvelleAdresse() {
        int n = ADRESSES.incrementAndGet();
        return "10.0." + (n / 250) + "." + (n % 250);
    }

    private String corps(String email, String motDePasse) throws Exception {
        return json.writeValueAsString(new AuthController.Identifiants(email, motDePasse));
    }

    private org.springframework.test.web.servlet.ResultActions connecter(
            String email, String motDePasse, String adresse) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", adresse)
                .content(corps(email, motDePasse)));
    }

    private String jeton(String email) throws Exception {
        String reponse = connecter(email, MOT_DE_PASSE, nouvelleAdresse())
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(reponse).get("token").asText();
    }

    /** Jeton signé avec la vraie clé, mais aux dates ou à l'émetteur choisis. */
    private String jetonSur(Instant emis, Instant expire, String emetteur) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(emetteur).subject(CONDUCTEUR).issuedAt(emis).expiresAt(expire)
                .claim("uid", 2).claim("nom", "Samir Haddou").claim("initiales", "SH")
                .claim("role", "CONDUCTEUR").build();
        return encodeur.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    @Nested
    @DisplayName("POST /api/auth/login")
    class Connexion {

        @Test
        @DisplayName("bons identifiants : 200, jeton et utilisateur")
        void connexionAcceptee() throws Exception {
            String reponse = connecter(CONDUCTEUR, MOT_DE_PASSE, nouvelleAdresse())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").value(not(emptyString())))
                    .andExpect(jsonPath("$.utilisateur.email").value(CONDUCTEUR))
                    .andExpect(jsonPath("$.utilisateur.nom").value("Samir Haddou"))
                    .andExpect(jsonPath("$.utilisateur.initiales").value("SH"))
                    .andExpect(jsonPath("$.utilisateur.role").value("CONDUCTEUR"))
                    .andExpect(jsonPath("$.utilisateur.motDePasse").doesNotExist())
                    .andReturn().getResponse().getContentAsString();

            // Le jeton est un JWT HS256 valable 8 h.
            String[] parties = json.readTree(reponse).get("token").asText().split("\\.");
            assertEquals(3, parties.length);
            JsonNode entete = json.readTree(java.util.Base64.getUrlDecoder().decode(parties[0]));
            JsonNode charge = json.readTree(java.util.Base64.getUrlDecoder().decode(parties[1]));
            assertEquals("HS256", entete.get("alg").asText());
            assertEquals(Duration.ofHours(8).toSeconds(),
                    charge.get("exp").asLong() - charge.get("iat").asLong());
            assertEquals("CONDUCTEUR", charge.get("role").asText());
        }

        @Test
        @DisplayName("l'e-mail est insensible à la casse et aux espaces")
        void emailNormalise() throws Exception {
            connecter("  Samir.Haddou@Souss-Batiment.demo ", MOT_DE_PASSE, nouvelleAdresse())
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("mauvais mot de passe : 401 RFC 9457")
        void mauvaisMotDePasse() throws Exception {
            connecter(MAGASINIER, "mauvais", nouvelleAdresse())
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"))
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.detail").value(MESSAGE_REFUS));
        }

        @Test
        @DisplayName("e-mail inconnu : même 401 et même message qu'un mauvais mot de passe")
        void emailInconnu() throws Exception {
            connecter("personne@souss-batiment.demo", MOT_DE_PASSE, nouvelleAdresse())
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.detail").value(MESSAGE_REFUS));
        }

        @Test
        @DisplayName("champs vides : 400 avec une erreur par champ")
        void champsVides() throws Exception {
            connecter("", "", nouvelleAdresse())
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erreurs.email").value("L'adresse e-mail est obligatoire"))
                    .andExpect(jsonPath("$.erreurs.motDePasse").value("Le mot de passe est obligatoire"));
        }

        @Test
        @DisplayName("5 échecs pour un même e-mail : 429 avec Retry-After, même avec le bon mot de passe")
        void tropDeTentativesParEmail() throws Exception {
            String email = "karim.aitali@souss-batiment.demo";
            for (int i = 0; i < 5; i++) {
                connecter(email, "mauvais-" + i, nouvelleAdresse()).andExpect(status().isUnauthorized());
            }
            connecter(email, MOT_DE_PASSE, nouvelleAdresse())
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.detail").value(containsString("Trop de tentatives")));
        }

        @Test
        @DisplayName("20 échecs depuis une même adresse IP : 429 pour tous les e-mails")
        void tropDeTentativesParAdresse() throws Exception {
            String adresse = nouvelleAdresse();
            for (int i = 0; i < 20; i++) {
                connecter("inconnu-" + UUID.randomUUID() + "@exemple.ma", "x", adresse)
                        .andExpect(status().isUnauthorized());
            }
            connecter(CONDUCTEUR, MOT_DE_PASSE, adresse).andExpect(status().isTooManyRequests());
        }
    }

    @Nested
    @DisplayName("GET /api/auth/verifier (gateway)")
    class Verifier {

        @Test
        @DisplayName("jeton valide : 200 avec X-Utilisateur et X-Role")
        void jetonValide() throws Exception {
            mvc.perform(get("/api/auth/verifier")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton(MAGASINIER)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("X-Utilisateur", MAGASINIER))
                    .andExpect(header().string("X-Role", "MAGASINIER"))
                    .andExpect(header().exists("X-Utilisateur-Id"));
        }

        @Test
        @DisplayName("sans jeton : 401 RFC 9457")
        void sansJeton() throws Exception {
            mvc.perform(get("/api/auth/verifier"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"))
                    .andExpect(jsonPath("$.detail").value(containsString("jeton absent")));
        }

        @Test
        @DisplayName("jeton expiré : 401")
        void jetonExpire() throws Exception {
            Instant maintenant = Instant.now();
            String expire = jetonSur(maintenant.minus(Duration.ofHours(9)),
                    maintenant.minus(Duration.ofHours(1)), ServiceJeton.EMETTEUR);
            mvc.perform(get("/api/auth/verifier").header(HttpHeaders.AUTHORIZATION, "Bearer " + expire))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("jeton signé avec une autre clé : 401")
        void mauvaiseSignature() throws Exception {
            var autreCle = new SecretKeySpec(
                    "une-autre-cle-de-32-caracteres-au-moins".getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256");
            var autreEncodeur = new NimbusJwtEncoder(new ImmutableSecret<>(autreCle));
            Instant maintenant = Instant.now();
            String falsifie = autreEncodeur.encode(JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder().issuer(ServiceJeton.EMETTEUR).subject(CONDUCTEUR)
                            .issuedAt(maintenant).expiresAt(maintenant.plusSeconds(3600))
                            .claim("role", "DIRECTION").build())).getTokenValue();
            mvc.perform(get("/api/auth/verifier").header(HttpHeaders.AUTHORIZATION, "Bearer " + falsifie))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("jeton d'un autre émetteur : 401")
        void autreEmetteur() throws Exception {
            Instant maintenant = Instant.now();
            String etranger = jetonSur(maintenant, maintenant.plusSeconds(3600), "autre-emetteur");
            mvc.perform(get("/api/auth/verifier").header(HttpHeaders.AUTHORIZATION, "Bearer " + etranger))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("jeton illisible : 401")
        void jetonIllisible() throws Exception {
            mvc.perform(get("/api/auth/verifier").header(HttpHeaders.AUTHORIZATION, "Bearer abc.def.ghi"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/auth/moi")
    class Moi {

        @Test
        @DisplayName("avec un jeton : l'utilisateur connecté")
        void utilisateurDuJeton() throws Exception {
            mvc.perform(get("/api/auth/moi")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton(CONDUCTEUR)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value(CONDUCTEUR))
                    .andExpect(jsonPath("$.nom").value("Samir Haddou"))
                    .andExpect(jsonPath("$.role").value("CONDUCTEUR"));
        }

        @Test
        @DisplayName("sans jeton : 401")
        void sansJeton() throws Exception {
            mvc.perform(get("/api/auth/moi")).andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName("les routes métier restent ouvertes aux appels internes (protégées par la gateway)")
    void routesMetierSansJeton() throws Exception {
        when(tachesClient.tachesDuChantier(anyLong())).thenReturn(Optional.of(List.of()));
        mvc.perform(get("/api/chantiers")).andExpect(status().isOk());
        // Un jeton expiré n'est pas lu hors de /api/auth/** : l'appel métier passe.
        Instant maintenant = Instant.now();
        String expire = jetonSur(maintenant.minus(Duration.ofHours(9)),
                maintenant.minus(Duration.ofHours(1)), ServiceJeton.EMETTEUR);
        mvc.perform(get("/api/chantiers").header(HttpHeaders.AUTHORIZATION, "Bearer " + expire))
                .andExpect(status().isOk());
    }
}
