package ma.uiz.btp.chantiers.integration;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Module Tâches (NestJS) simulé par un vrai serveur HTTP local : Chantiers l'appelle par le réseau,
 * comme en production (GET /api/taches?chantierId=). Seul module externe remplacé : il n'est pas
 * écrit en Java et Chantiers ne le joint que par HTTP. Chaque chantier a sa propre réponse, ce qui
 * permet aux scénarios de partager le même serveur.
 */
final class ModuleTachesSimule {

    /** Réponse programmée pour un chantier : code HTTP, corps JSON et délai avant réponse. */
    record Reponse(int code, String corps, long delaiMs) {}

    private static final Reponse AUCUNE_TACHE = new Reponse(200, "[]", 0);

    private final HttpServer serveur;
    private final Map<String, Reponse> reponses = new ConcurrentHashMap<>();
    private final List<String> appels = new CopyOnWriteArrayList<>();

    ModuleTachesSimule() {
        try {
            serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        serveur.createContext("/api/taches", echange -> {
            String requete = echange.getRequestURI().toString();
            appels.add(requete);
            Reponse r = reponses.getOrDefault(chantierId(echange.getRequestURI().getRawQuery()),
                    AUCUNE_TACHE);
            pause(r.delaiMs());
            byte[] octets = r.corps().getBytes(StandardCharsets.UTF_8);
            echange.getResponseHeaders().add("Content-Type", "application/json");
            echange.sendResponseHeaders(r.code(), octets.length == 0 ? -1 : octets.length);
            try (OutputStream sortie = echange.getResponseBody()) {
                sortie.write(octets);
            }
        });
        serveur.start();
    }

    String url() {
        return "http://127.0.0.1:" + serveur.getAddress().getPort();
    }

    /** Les tâches que Tâches renverra pour ce chantier (tableau JSON). */
    void taches(long chantierId, String json) {
        reponses.put(String.valueOf(chantierId), new Reponse(200, json, 0));
    }

    /** Tâches répond en erreur (5xx…) pour ce chantier. */
    void erreur(long chantierId, int code) {
        reponses.put(String.valueOf(chantierId),
                new Reponse(code, "{\"message\":\"Erreur interne\"}", 0));
    }

    /** Tâches met trop longtemps à répondre (délai supérieur au timeout de Chantiers). */
    void lent(long chantierId, long delaiMs) {
        reponses.put(String.valueOf(chantierId), new Reponse(200, "[]", delaiMs));
    }

    /** Nombre d'appels reçus pour ce chantier. */
    long appelsPour(long chantierId) {
        return appels.stream().filter(a -> a.endsWith("chantierId=" + chantierId)).count();
    }

    void reinitialiser() {
        reponses.clear();
        appels.clear();
    }

    void arreter() {
        serveur.stop(0);
    }

    private static String chantierId(String requete) {
        if (requete == null) {
            return "";
        }
        for (String paire : requete.split("&")) {
            if (paire.startsWith("chantierId=")) {
                return URLDecoder.decode(paire.substring("chantierId=".length()),
                        StandardCharsets.UTF_8);
            }
        }
        return "";
    }

    private static void pause(long ms) {
        if (ms <= 0) {
            return;
        }
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
