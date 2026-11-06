package ma.uiz.btp.chantiers.auth;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite les échecs de connexion (force brute) : au-delà de N échecs pour un même e-mail, ou de M
 * pour une même adresse IP, sur une fenêtre glissante, la connexion est refusée (429) jusqu'à ce
 * que les plus anciens échecs sortent de la fenêtre. En mémoire : remis à zéro au redémarrage.
 */
@Component
public class LimiteurTentatives {

    private final Map<String, Deque<Instant>> echecs = new ConcurrentHashMap<>();
    private final int maxParEmail;
    private final int maxParAdresse;
    private final Duration fenetre;
    private final Clock horloge;

    public LimiteurTentatives(AuthProperties proprietes, Clock horloge) {
        AuthProperties.Tentatives t = proprietes.tentatives();
        this.maxParEmail = t == null ? 5 : t.maxParEmail();
        this.maxParAdresse = t == null ? 20 : t.maxParAdresse();
        this.fenetre = t == null ? Duration.ofMinutes(15) : t.fenetre();
        this.horloge = horloge;
    }

    /** Lève TropDeTentativesException si l'e-mail ou l'adresse a atteint sa limite. */
    public void verifier(String email, String adresse) {
        Instant maintenant = horloge.instant();
        long attente = Math.max(
                attente(cleEmail(email), maxParEmail, maintenant),
                attente(cleAdresse(adresse), maxParAdresse, maintenant));
        if (attente > 0) {
            throw new TropDeTentativesException(attente);
        }
    }

    public void echec(String email, String adresse) {
        Instant maintenant = horloge.instant();
        ajouter(cleEmail(email), maintenant);
        ajouter(cleAdresse(adresse), maintenant);
    }

    /** Une connexion réussie efface les échecs de cet e-mail (pas ceux de l'adresse). */
    public void succes(String email) {
        echecs.remove(cleEmail(email));
    }

    private static String cleEmail(String email) {
        return "email:" + email.trim().toLowerCase();
    }

    private static String cleAdresse(String adresse) {
        return "ip:" + adresse;
    }

    private void ajouter(String cle, Instant maintenant) {
        echecs.compute(cle, (k, file) -> {
            Deque<Instant> f = file == null ? new ArrayDeque<>() : file;
            purger(f, maintenant);
            f.addLast(maintenant);
            return f;
        });
    }

    /** Secondes à attendre avant un nouvel essai (0 si la limite n'est pas atteinte). */
    private long attente(String cle, int max, Instant maintenant) {
        long[] resultat = {0};
        echecs.computeIfPresent(cle, (k, f) -> {
            purger(f, maintenant);
            if (f.size() >= max) {
                Instant libre = f.peekFirst().plus(fenetre);
                resultat[0] = Math.max(1, Duration.between(maintenant, libre).toSeconds());
            }
            return f.isEmpty() ? null : f;
        });
        return resultat[0];
    }

    private void purger(Deque<Instant> f, Instant maintenant) {
        Instant limite = maintenant.minus(fenetre);
        while (!f.isEmpty() && !f.peekFirst().isAfter(limite)) {
            f.pollFirst();
        }
    }
}
