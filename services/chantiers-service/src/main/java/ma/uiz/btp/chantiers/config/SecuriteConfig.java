package ma.uiz.btp.chantiers.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import ma.uiz.btp.chantiers.auth.AuthProperties;
import ma.uiz.btp.chantiers.auth.ServiceJeton;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Objects;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

/**
 * Sécurité de Chantiers (ADR-0006). Seuls /api/auth/moi et /api/auth/verifier exigent un jeton :
 * les autres routes sont protégées par la gateway (auth_request), et les appels internes entre
 * services (Tâches, Matériaux) arrivent sans jeton.
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecuriteConfig {

    private static final int LONGUEUR_MIN_SECRET = 32;

    @Bean
    SecurityFilterChain filtres(HttpSecurity http, AuthenticationEntryPoint nonAuthentifie)
            throws Exception {
        return http
                // CSRF : l'API REST (/api/**) est sans état, authentifiée par l'en-tête
                // Authorization et n'émet aucun cookie : un site tiers ne peut pas forger de
                // requête authentifiée, le jeton CSRF n'y protège de rien et bloquerait les
                // POST, PUT et PATCH (403). La protection reste active sur les autres routes.
                .csrf(c -> c.ignoringRequestMatchers("/api/**"))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/auth/moi", "/api/auth/verifier").authenticated()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(o -> o
                        .bearerTokenResolver(jetonSurLesRoutesAuth())
                        .authenticationEntryPoint(nonAuthentifie)
                        .jwt(Customizer.withDefaults()))
                .exceptionHandling(e -> e.authenticationEntryPoint(nonAuthentifie))
                .build();
    }

    /**
     * Le jeton n'est lu que sur /api/auth/** : un jeton expiré ne doit pas faire échouer un appel
     * à /api/chantiers (déjà filtré par la gateway).
     */
    private static BearerTokenResolver jetonSurLesRoutesAuth() {
        DefaultBearerTokenResolver standard = new DefaultBearerTokenResolver();
        return requete -> requete.getRequestURI().startsWith("/api/auth/")
                ? standard.resolve(requete)
                : null;
    }

    /** 401 au format RFC 9457, comme les autres erreurs de l'API. */
    @Bean
    AuthenticationEntryPoint nonAuthentifie(ObjectMapper json) {
        return (requete, reponse, exception) -> {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                    "Authentification requise : jeton absent, invalide ou expiré.");
            pd.setInstance(URI.create(requete.getRequestURI()));
            reponse.setStatus(HttpStatus.UNAUTHORIZED.value());
            reponse.setHeader("WWW-Authenticate", "Bearer");
            reponse.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            reponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
            json.writeValue(reponse.getOutputStream(), pd);
        };
    }

    @Bean
    SecretKey cleJwt(AuthProperties proprietes) {
        String secret = proprietes.jwt() == null ? null : proprietes.jwt().secret();
        int longueur = secret == null ? 0 : secret.getBytes(StandardCharsets.UTF_8).length;
        if (longueur < LONGUEUR_MIN_SECRET) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins "
                    + LONGUEUR_MIN_SECRET + " caractères (voir .env.example).");
        }
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey cleJwt) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(cleJwt));
    }

    /** Signature HS256, expiration (tolérance de 60 s) et émetteur vérifiés. */
    @Bean
    JwtDecoder jwtDecoder(SecretKey cleJwt, Clock horloge) {
        NimbusJwtDecoder decodeur = NimbusJwtDecoder.withSecretKey(cleJwt)
                .macAlgorithm(MacAlgorithm.HS256).build();
        JwtTimestampValidator horodatage = new JwtTimestampValidator();
        horodatage.setClock(horloge);
        decodeur.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                horodatage,
                new JwtClaimValidator<String>(JwtClaimNames.ISS,
                        iss -> Objects.equals(iss, ServiceJeton.EMETTEUR))));
        return decodeur;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    Clock horloge() {
        return Clock.systemUTC();
    }
}
