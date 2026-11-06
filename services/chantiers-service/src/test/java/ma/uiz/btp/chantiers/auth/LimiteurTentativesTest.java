package ma.uiz.btp.chantiers.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LimiteurTentativesTest {

    /** Horloge réglable à la main. */
    static final class HorlogeManuelle extends Clock {
        private Instant maintenant = Instant.parse("2026-11-06T08:00:00Z");

        void avancer(Duration d) {
            maintenant = maintenant.plus(d);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return maintenant; }
    }

    private final HorlogeManuelle horloge = new HorlogeManuelle();
    private final LimiteurTentatives limiteur = new LimiteurTentatives(
            new AuthProperties(null, null,
                    new AuthProperties.Tentatives(3, 5, Duration.ofMinutes(15))),
            horloge);

    @Test
    @DisplayName("sous la limite : la connexion est permise")
    void sousLaLimite() {
        limiteur.echec("a@b.ma", "1.1.1.1");
        limiteur.echec("a@b.ma", "1.1.1.1");
        assertDoesNotThrow(() -> limiteur.verifier("a@b.ma", "1.1.1.1"));
    }

    @Test
    @DisplayName("limite par e-mail atteinte : refus avec le délai restant, puis libéré après la fenêtre")
    void limiteParEmail() {
        for (int i = 0; i < 3; i++) {
            limiteur.echec("A@b.ma ", "1.1.1." + i);
        }
        horloge.avancer(Duration.ofMinutes(5));
        var e = assertThrows(TropDeTentativesException.class,
                () -> limiteur.verifier("a@b.ma", "9.9.9.9"));
        assertEquals(Duration.ofMinutes(10).toSeconds(), e.getAttenteSecondes());
        assertTrue(e.getMessage().contains("10 minute(s)"));

        horloge.avancer(Duration.ofMinutes(10));
        assertDoesNotThrow(() -> limiteur.verifier("a@b.ma", "9.9.9.9"));
    }

    @Test
    @DisplayName("limite par adresse IP atteinte : refus pour tous les e-mails")
    void limiteParAdresse() {
        for (int i = 0; i < 5; i++) {
            limiteur.echec("u" + i + "@b.ma", "2.2.2.2");
        }
        assertThrows(TropDeTentativesException.class, () -> limiteur.verifier("neuf@b.ma", "2.2.2.2"));
        assertDoesNotThrow(() -> limiteur.verifier("neuf@b.ma", "3.3.3.3"));
    }

    @Test
    @DisplayName("une connexion réussie remet à zéro les échecs de l'e-mail")
    void succesRemetAZero() {
        limiteur.echec("a@b.ma", "1.1.1.1");
        limiteur.echec("a@b.ma", "1.1.1.1");
        limiteur.succes("a@b.ma");
        limiteur.echec("a@b.ma", "1.1.1.1");
        limiteur.echec("a@b.ma", "1.1.1.1");
        assertDoesNotThrow(() -> limiteur.verifier("a@b.ma", "4.4.4.4"));
    }
}
