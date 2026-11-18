package ma.uiz.btp.chantiers.auth;

/**
 * Compte de la table auth.utilisateurs.
 *
 * @param motDePasse empreinte BCrypt, ou null si aucun mot de passe n'est défini
 */
public record Utilisateur(
        long id, String email, String motDePasse, String nom, String initiales, Role role,
        boolean demo) {

    @Override
    public String toString() {
        // Jamais l'empreinte du mot de passe dans les logs.
        return "Utilisateur[id=" + id + ", email=" + email + ", role=" + role + "]";
    }
}
