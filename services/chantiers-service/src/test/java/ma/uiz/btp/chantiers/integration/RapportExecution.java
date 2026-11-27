package ma.uiz.btp.chantiers.integration;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.support.descriptor.ClassSource;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;

/**
 * Résumé des tests d'intégration (target/rapport-integration.md) : résultat par scénario et temps
 * de réponse de l'API (moyen, maximal). Sans effet pour les tests unitaires (aucun appel HTTP).
 */
public class RapportExecution implements TestExecutionListener {

    private record Ligne(String scenario, String test, String resultat) {}

    private final List<Ligne> lignes = new ArrayList<>();
    private final Map<String, String> scenarios = new ConcurrentHashMap<>();
    private TestPlan plan;

    @Override
    public void testPlanExecutionStarted(TestPlan testPlan) {
        this.plan = testPlan;
    }

    @Override
    public synchronized void executionFinished(TestIdentifier id, TestExecutionResult resultat) {
        if (id.getSource().orElse(null) instanceof ClassSource source
                && source.getClassName().startsWith(getClass().getPackageName())) {
            scenarios.put(id.getUniqueId(), id.getDisplayName());
        }
        if (!id.isTest() || plan == null) {
            return;
        }
        String scenario = scenarioDe(id);
        if (scenario != null) {
            lignes.add(new Ligne(scenario, id.getDisplayName(), resultat.getStatus().name()));
        }
    }

    private String scenarioDe(TestIdentifier id) {
        TestIdentifier courant = id;
        while (courant != null) {
            if (courant.getSource().orElse(null) instanceof ClassSource source
                    && source.getClassName().startsWith(getClass().getPackageName() + ".S")) {
                return courant.getDisplayName();
            }
            courant = plan.getParent(courant).orElse(null);
        }
        return null;
    }

    @Override
    public synchronized void testPlanExecutionFinished(TestPlan testPlan) {
        if (lignes.isEmpty()) {
            return;
        }
        long reussis = lignes.stream().filter(l -> "SUCCESSFUL".equals(l.resultat())).count();
        LongSummaryStatistics t = ClientApi.DUREES.stream().mapToLong(Long::longValue)
                .summaryStatistics();
        StringBuilder md = new StringBuilder("# Tests d'intégration du module Chantiers\n\n")
                .append("- Tests : ").append(lignes.size()).append(", réussis : ").append(reussis)
                .append(", en échec : ").append(lignes.size() - reussis).append('\n')
                .append(String.format("- Requêtes HTTP : %d, temps moyen %.1f ms, maximum %d ms%n",
                        t.getCount(), t.getAverage(), t.getMax()))
                .append("\n| Scénario | Test | Résultat |\n|---|---|---|\n");
        lignes.forEach(l -> md.append("| ").append(l.scenario()).append(" | ").append(l.test())
                .append(" | ").append(l.resultat()).append(" |\n"));
        try {
            Path sortie = Path.of("target", "rapport-integration.md");
            Files.createDirectories(sortie.getParent());
            Files.writeString(sortie, md);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        System.out.println(md);
    }
}
