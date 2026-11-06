package ma.uiz.btp.chantiers.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Au démarrage, aligne le mot de passe des comptes de démonstration (créés par Flyway, V2)
 * sur la variable DEMO_MOT_DE_PASSE. Aucun mot de passe n'est écrit dans le code.
 */
@Component
public class ComptesDemo implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(ComptesDemo.class);

    private final UtilisateurRepository utilisateurs;
    private final PasswordEncoder encodeur;
    private final String motDePasse;

    public ComptesDemo(UtilisateurRepository utilisateurs, PasswordEncoder encodeur,
                       AuthProperties proprietes) {
        this.utilisateurs = utilisateurs;
        this.encodeur = encodeur;
        this.motDePasse = proprietes.demo() == null ? null : proprietes.demo().motDePasse();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (motDePasse == null || motDePasse.isBlank()) {
            LOG.warn("DEMO_MOT_DE_PASSE n'est pas défini : les comptes de démonstration "
                    + "ne peuvent pas se connecter (voir .env.example).");
            return;
        }
        int mis = 0;
        for (Utilisateur u : utilisateurs.comptesDemo()) {
            if (u.motDePasse() == null || !encodeur.matches(motDePasse, u.motDePasse())) {
                utilisateurs.changerMotDePasse(u.id(), encodeur.encode(motDePasse));
                mis++;
            }
        }
        LOG.info("Comptes de démonstration prêts ({} mot(s) de passe mis à jour).", mis);
    }
}
