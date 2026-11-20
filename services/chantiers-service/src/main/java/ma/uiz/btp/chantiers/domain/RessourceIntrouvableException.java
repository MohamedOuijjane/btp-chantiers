package ma.uiz.btp.chantiers.domain;

/** Ressource inexistante (HTTP 404). */
public class RessourceIntrouvableException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé au client. */
    public RessourceIntrouvableException(String message) {
        super(message);
    }
}
