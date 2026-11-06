package ma.uiz.btp.chantiers.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/** Connexion : vérification du mot de passe, limitation des tentatives, émission du jeton. */
@Service
public class ServiceAuthentification {

    /** Résultat d'une connexion réussie. */
    public record Connexion(String jeton, Utilisateur utilisateur) {}

    private final UtilisateurRepository utilisateurs;
    private final PasswordEncoder encodeur;
    private final ServiceJeton jetons;
    private final LimiteurTentatives limiteur;
    /** Empreinte comparée quand l'e-mail est inconnu : même durée de réponse que pour un compte. */
    private final String empreinteFactice;

    public ServiceAuthentification(UtilisateurRepository utilisateurs, PasswordEncoder encodeur,
                                   ServiceJeton jetons, LimiteurTentatives limiteur) {
        this.utilisateurs = utilisateurs;
        this.encodeur = encodeur;
        this.jetons = jetons;
        this.limiteur = limiteur;
        this.empreinteFactice = encodeur.encode("empreinte-factice-sans-compte");
    }

    public Connexion connecter(String email, String motDePasse, String adresse) {
        limiteur.verifier(email, adresse);
        Optional<Utilisateur> compte = utilisateurs.trouverParEmail(email);
        String empreinte = compte.map(Utilisateur::motDePasse).orElse(null);
        boolean valide = encodeur.matches(motDePasse,
                empreinte == null ? empreinteFactice : empreinte);
        if (compte.isEmpty() || empreinte == null || !valide) {
            limiteur.echec(email, adresse);
            throw new IdentifiantsInvalidesException();
        }
        limiteur.succes(email);
        Utilisateur u = compte.get();
        return new Connexion(jetons.emettre(u).getTokenValue(), u);
    }
}
