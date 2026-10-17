package ma.uiz.btp.chantiers.domain;

/** Violation d'une règle de gestion (HTTP 409). */
public class RegleMetierException extends RuntimeException {
    public RegleMetierException(String message) { super(message); }
}
