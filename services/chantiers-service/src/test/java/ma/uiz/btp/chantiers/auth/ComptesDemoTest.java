package ma.uiz.btp.chantiers.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ComptesDemoTest {

    private final UtilisateurRepository depot = mock(UtilisateurRepository.class);
    private final PasswordEncoder encodeur = new BCryptPasswordEncoder(4);

    private ComptesDemo avecMotDePasse(String motDePasse) {
        return new ComptesDemo(depot, encodeur,
                new AuthProperties(null, new AuthProperties.Demo(motDePasse), null));
    }

    private static Utilisateur compte(long id, String empreinte) {
        return new Utilisateur(id, "u" + id + "@souss-batiment.demo", empreinte, "U", "U",
                Role.CONDUCTEUR, true);
    }

    @Test
    @DisplayName("sans DEMO_MOT_DE_PASSE : aucun compte n'est modifié")
    void sansMotDePasse() {
        avecMotDePasse("  ").run(null);
        verify(depot, never()).comptesDemo();
        verify(depot, never()).changerMotDePasse(anyLong(), anyString());
    }

    @Test
    @DisplayName("hache le mot de passe des comptes sans mot de passe ou avec un ancien mot de passe")
    void alignementDesMotsDePasse() {
        String actuel = encodeur.encode("secret-demo");
        when(depot.comptesDemo()).thenReturn(List.of(
                compte(1, null), compte(2, encodeur.encode("ancien")), compte(3, actuel)));

        avecMotDePasse("secret-demo").run(null);

        verify(depot).changerMotDePasse(eq(1L), argThat(h -> encodeur.matches("secret-demo", h)));
        verify(depot).changerMotDePasse(eq(2L), argThat(h -> encodeur.matches("secret-demo", h)));
        verify(depot, never()).changerMotDePasse(eq(3L), anyString());
    }
}
