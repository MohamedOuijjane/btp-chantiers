package ma.uiz.btp.chantiers.auth;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Accès à auth.utilisateurs, avec la connexion de auth_user (jamais celle des chantiers). */
@Repository
public class UtilisateurRepository {

    private static final String COLONNES =
            "id, email, mot_de_passe, nom, initiales, role, demo FROM auth.utilisateurs";

    private static final RowMapper<Utilisateur> LIGNE = (rs, i) -> new Utilisateur(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("mot_de_passe"),
            rs.getString("nom"),
            rs.getString("initiales"),
            Role.valueOf(rs.getString("role")),
            rs.getBoolean("demo"));

    private final JdbcClient jdbc;

    public UtilisateurRepository(@Qualifier("authJdbcClient") JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Recherche insensible à la casse ; l'e-mail est stocké en minuscules. */
    public Optional<Utilisateur> trouverParEmail(String email) {
        return jdbc.sql("SELECT " + COLONNES + " WHERE email = :email")
                .param("email", email.trim().toLowerCase())
                .query(LIGNE)
                .optional();
    }

    public List<Utilisateur> comptesDemo() {
        return jdbc.sql("SELECT " + COLONNES + " WHERE demo = TRUE ORDER BY id")
                .query(LIGNE)
                .list();
    }

    public void changerMotDePasse(long id, String empreinte) {
        jdbc.sql("UPDATE auth.utilisateurs SET mot_de_passe = :mdp WHERE id = :id")
                .param("mdp", empreinte)
                .param("id", id)
                .update();
    }
}
