package ma.uiz.btp.materiaux.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.util.ReflectionTestUtils;

/** Requêtes de ListerMouvements (#18) sur H2 : filtres et tri du plus récent au plus ancien. */
@DataJpaTest
class MouvementRepositoryTest {

    @Autowired TestEntityManager em;
    @Autowired MouvementRepository mouvements;

    private MateriauEntity ciment;
    private MateriauEntity fer;

    private Long mouvement(MateriauEntity m, long chantierId, String date) {
        Mouvement mv = new Mouvement(m, chantierId, Mouvement.Type.SORTIE, 1);
        ReflectionTestUtils.setField(mv, "date", Instant.parse(date));
        return em.persistAndFlush(mv).getId();
    }

    private static List<Long> ids(List<Mouvement> liste) {
        return liste.stream().map(Mouvement::getId).toList();
    }

    @BeforeEach
    void donnees() {
        ciment = em.persist(MateriauEntityTest.ciment(100, 10));
        fer = MateriauEntityTest.ciment(50, 5);
        fer.setReference("FER-12");
        fer = em.persistAndFlush(fer);
    }

    @Test
    @DisplayName("UT-MAT-54 : tous les mouvements, du plus récent au plus ancien")
    void tousDuPlusRecent() {
        Long ancien = mouvement(ciment, 7, "2027-03-01T08:00:00Z");
        Long recent = mouvement(fer, 8, "2027-03-05T08:00:00Z");
        Long milieu = mouvement(ciment, 8, "2027-03-03T08:00:00Z");

        assertEquals(List.of(recent, milieu, ancien), ids(mouvements.tous()));
    }

    @Test
    @DisplayName("UT-MAT-55 : à date égale, le dernier enregistré d'abord")
    void dateEgaleDepartageeParIdentifiant() {
        Long premier = mouvement(ciment, 7, "2027-03-01T08:00:00Z");
        Long second = mouvement(ciment, 7, "2027-03-01T08:00:00Z");

        assertEquals(List.of(second, premier), ids(mouvements.tous()));
    }

    @Test
    @DisplayName("UT-MAT-56 : filtres par chantier, par matériau, et les deux")
    void filtres() {
        Long c7 = mouvement(ciment, 7, "2027-03-01T08:00:00Z");
        Long f8 = mouvement(fer, 8, "2027-03-02T08:00:00Z");
        Long c8 = mouvement(ciment, 8, "2027-03-03T08:00:00Z");

        assertEquals(List.of(c8, f8), ids(mouvements.parChantier(8L)));
        assertEquals(List.of(c8, c7),
                ids(mouvements.parMateriau(ciment.getId())));
        assertEquals(List.of(c8),
                ids(mouvements.parChantierEtMateriau(8L, ciment.getId())));
        assertEquals(List.of(), mouvements.parChantier(99L));
        assertEquals(ciment.getId(), mouvements.findById(c7).orElseThrow().getMateriauId());
    }
}
