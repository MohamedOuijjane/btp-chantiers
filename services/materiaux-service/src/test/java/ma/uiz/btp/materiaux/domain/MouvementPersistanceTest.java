package ma.uiz.btp.materiaux.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

/**
 * Persistance sur H2 (sans vraie base) : lien du mouvement vers son matériau (association
 * @ManyToOne exclue de SpotBugs EI_EXPOSE_REP2) ; le verrou optimiste est testé dans VerrouOptimisteTest.
 */
@DataJpaTest
class MouvementPersistanceTest {

    @Autowired TestEntityManager em;
    @Autowired MateriauRepository materiaux;
    @Autowired MouvementRepository mouvements;

    @Test
    @DisplayName("UT-MAT-16 : le mouvement enregistré pointe vers le matériau en base (même entité gérée)")
    void mouvementLieAuMateriauEnBase() {
        MateriauEntity m = em.persistFlushFind(MateriauEntityTest.ciment(100, 20));
        m.sortir(30);
        Long id = mouvements.save(new Mouvement(m, 7L, Mouvement.Type.SORTIE, 30)).getId();
        em.flush();
        em.clear();

        Mouvement relu = mouvements.findById(id).orElseThrow();
        Number materiauEnBase = (Number) em.getEntityManager()
                .createNativeQuery("select materiau_id from mouvements where id = :id")
                .setParameter("id", id).getSingleResult();
        assertEquals(m.getId(), materiauEnBase.longValue());
        assertEquals(70, relu.getStockApresMouvement());
        assertEquals(70, materiaux.findById(m.getId()).orElseThrow().getStock());
    }

    @Test
    @DisplayName("UT-MAT-17 : la référence d'un matériau est unique en base")
    void referenceUnique() {
        em.persistAndFlush(MateriauEntityTest.ciment(10, 5));
        MateriauEntity doublon = MateriauEntityTest.ciment(20, 5);
        assertThrows(RuntimeException.class, () -> em.persistAndFlush(doublon));
    }

    @Test
    @DisplayName("UT-MAT-18 : findEnAlerte ne renvoie que les matériaux au seuil ou en dessous")
    void findEnAlerte() {
        MateriauEntity normal = MateriauEntityTest.ciment(100, 20);
        MateriauEntity auSeuil = MateriauEntityTest.ciment(20, 20);
        auSeuil.setReference("CIM-02");
        em.persist(normal);
        em.persistAndFlush(auSeuil);

        assertEquals(1, materiaux.findEnAlerte().size());
        assertEquals("CIM-02", materiaux.findEnAlerte().get(0).getReference());
    }
}

