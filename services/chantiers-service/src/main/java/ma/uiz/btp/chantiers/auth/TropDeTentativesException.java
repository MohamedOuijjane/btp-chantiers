package ma.uiz.btp.chantiers.auth;

/** Trop d'échecs de connexion : 429, avec le délai d'attente dans l'en-tête Retry-After. */
public class TropDeTentativesException extends RuntimeException {

    private final long attenteSecondes;

    public TropDeTentativesException(long attenteSecondes) {
        super("Trop de tentatives de connexion. Réessayez dans "
                + Math.max(1, (attenteSecondes + 59) / 60) + " minute(s).");
        this.attenteSecondes = attenteSecondes;
    }

    public long getAttenteSecondes() {
        return attenteSecondes;
    }
}
