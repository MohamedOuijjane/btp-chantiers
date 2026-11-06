package ma.uiz.btp.chantiers.auth;

/**
 * Connexion refusée : 401. Même message pour un e-mail inconnu et un mauvais mot de passe,
 * pour ne pas révéler quels comptes existent.
 */
public class IdentifiantsInvalidesException extends RuntimeException {

    public IdentifiantsInvalidesException() {
        super("Adresse e-mail ou mot de passe incorrect.");
    }
}
