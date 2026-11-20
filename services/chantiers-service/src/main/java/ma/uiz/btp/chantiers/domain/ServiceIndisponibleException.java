package ma.uiz.btp.chantiers.domain;

/** Un module appelé ne répond pas ou répond en erreur : l'opération est annulée (HTTP 503). */
public class ServiceIndisponibleException extends RuntimeException {

    /** Crée l'exception avec le message fonctionnel renvoyé au client. */
    public ServiceIndisponibleException(String message) {
        super(message);
    }
}
