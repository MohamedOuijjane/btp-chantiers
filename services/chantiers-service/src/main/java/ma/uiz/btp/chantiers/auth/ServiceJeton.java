package ma.uiz.btp.chantiers.auth;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/** Émission des JWT HS256 (ADR-0006). La vérification est faite par le JwtDecoder de Spring. */
@Service
public class ServiceJeton {

    /** Émetteur des jetons, vérifié au décodage. */
    public static final String EMETTEUR = "btp-chantiers";

    private final JwtEncoder encodeur;
    private final Duration duree;
    private final Clock horloge;

    public ServiceJeton(JwtEncoder encodeur, AuthProperties proprietes, Clock horloge) {
        this.encodeur = encodeur;
        this.duree = proprietes.jwt().duree();
        this.horloge = horloge;
    }

    /** Jeton de l'utilisateur : sub = e-mail, et les claims uid, nom, initiales, role. */
    public Jwt emettre(Utilisateur u) {
        Instant maintenant = horloge.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(EMETTEUR)
                .subject(u.email())
                .issuedAt(maintenant)
                .expiresAt(maintenant.plus(duree))
                .claim("uid", u.id())
                .claim("nom", u.nom())
                .claim("initiales", u.initiales())
                .claim("role", u.role().name())
                .build();
        JwsHeader entete = JwsHeader.with(MacAlgorithm.HS256).build();
        return encodeur.encode(JwtEncoderParameters.from(entete, claims));
    }
}
