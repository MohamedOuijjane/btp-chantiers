package ma.uiz.btp.chantiers.domain;

/** Ressource inexistante (HTTP 404). */
public class RessourceIntrouvableException extends RuntimeException {
    public RessourceIntrouvableException(String message) { super(message); }
}
