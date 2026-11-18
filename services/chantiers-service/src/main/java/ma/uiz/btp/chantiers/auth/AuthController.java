package ma.uiz.btp.chantiers.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Connexion et vérification des jetons (ADR-0006). */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentification", description = "Connexion par JWT, vérifié par la gateway")
public class AuthController {

    /** Corps de POST /api/auth/login. */
    public record Identifiants(
            @NotBlank(message = "L'adresse e-mail est obligatoire") String email,
            @NotBlank(message = "Le mot de passe est obligatoire") String motDePasse) {}

    /** Utilisateur connecté, au format du type Utilisateur du front. */
    public record UtilisateurDto(long id, String email, String nom, String initiales, Role role) {

        static UtilisateurDto de(Utilisateur u) {
            return new UtilisateurDto(u.id(), u.email(), u.nom(), u.initiales(), u.role());
        }

        static UtilisateurDto de(Jwt jwt) {
            Number uid = jwt.getClaim("uid");
            return new UtilisateurDto(uid.longValue(), jwt.getSubject(),
                    jwt.getClaimAsString("nom"), jwt.getClaimAsString("initiales"),
                    Role.valueOf(jwt.getClaimAsString("role")));
        }
    }

    /** Réponse de POST /api/auth/login. */
    public record Connexion(String token, UtilisateurDto utilisateur) {}

    private final ServiceAuthentification service;

    public AuthController(ServiceAuthentification service) {
        this.service = service;
    }

    @PostMapping("/login")
    @Operation(summary = "Se connecter",
            description = "Renvoie un JWT HS256 valable 8 h. 401 si les identifiants sont faux "
                    + "(même message pour un e-mail inconnu), 429 après trop d'échecs.")
    public Connexion login(@Valid @RequestBody Identifiants identifiants,
                           HttpServletRequest requete) {
        var c = service.connecter(identifiants.email(), identifiants.motDePasse(),
                adresseClient(requete));
        return new Connexion(c.jeton(), UtilisateurDto.de(c.utilisateur()));
    }

    @GetMapping("/moi")
    @Operation(summary = "Utilisateur du jeton", security = @SecurityRequirement(name = "jwt"))
    public UtilisateurDto moi(@AuthenticationPrincipal Jwt jwt) {
        return UtilisateurDto.de(jwt);
    }

    /**
     * Appelé par la gateway (auth_request) avant chaque requête protégée : 200 avec les en-têtes
     * X-Utilisateur et X-Role, ou 401 si le jeton est absent, invalide ou expiré.
     */
    @GetMapping("/verifier")
    @Operation(summary = "Vérifier un jeton (gateway)",
            security = @SecurityRequirement(name = "jwt"))
    public ResponseEntity<Void> verifier(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok()
                .header("X-Utilisateur", jwt.getSubject())
                .header("X-Utilisateur-Id", String.valueOf(jwt.<Number>getClaim("uid")))
                .header("X-Role", jwt.getClaimAsString("role"))
                .build();
    }

    /**
     * Adresse du client pour limiter les tentatives. Derrière la gateway, c'est la dernière
     * valeur de X-Forwarded-For (celle ajoutée par nginx, que le client ne peut pas choisir).
     */
    static String adresseClient(HttpServletRequest requete) {
        String transmis = requete.getHeader("X-Forwarded-For");
        if (transmis != null && !transmis.isBlank()) {
            String[] adresses = transmis.split(",");
            return adresses[adresses.length - 1].trim();
        }
        return requete.getRemoteAddr();
    }
}
