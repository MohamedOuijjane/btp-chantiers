package ma.uiz.btp.materiaux.domain;

/**
 * Codes de SOAP Fault propres au module (#145), dans le namespace du contrat. Le front les
 * convertit en codes HTTP : Introuvable → 404, Conflit → 409. Les autres erreurs restent en
 * Client (refus de la demande) ou Server (panne).
 */
public final class FautesMateriaux {

    /** Matériau ou chantier introuvable. */
    public static final String INTROUVABLE = "{http://btp.uiz.ma/materiaux}Introuvable";

    /** Conflit : stock modifié en même temps, référence déjà utilisée. */
    public static final String CONFLIT = "{http://btp.uiz.ma/materiaux}Conflit";

    private FautesMateriaux() {
    }
}
