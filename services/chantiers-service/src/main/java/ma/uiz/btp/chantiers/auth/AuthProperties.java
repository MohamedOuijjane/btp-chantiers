package ma.uiz.btp.chantiers.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/** Réglages de l'authentification (section « auth » de application.yml, ADR-0006). */
@ConfigurationProperties("auth")
public record AuthProperties(Jwt jwt, Demo demo, Tentatives tentatives) {

    /** Secret HS256 (JWT_SECRET, au moins 32 caractères) et durée de validité du jeton. */
    public record Jwt(String secret, @DefaultValue("8h") Duration duree) {}

    /** Mot de passe des comptes de démonstration (DEMO_MOT_DE_PASSE). */
    public record Demo(String motDePasse) {}

    /** Limite des échecs de connexion par e-mail et par adresse IP, sur une fenêtre glissante. */
    public record Tentatives(
            @DefaultValue("5") int maxParEmail,
            @DefaultValue("20") int maxParAdresse,
            @DefaultValue("15m") Duration fenetre) {}
}
