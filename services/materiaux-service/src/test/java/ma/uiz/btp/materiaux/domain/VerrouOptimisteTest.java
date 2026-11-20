package ma.uiz.btp.materiaux.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
/**
 * Verrou optimiste : deux transactions réelles (hors de la transaction de test) lisent le même
 * matériau ; la seconde écriture, faite sur une version périmée, est refusée.
 */
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class VerrouOptimisteTest {

    @Autowired MateriauRepository materiaux;
    @Autowired TransactionTemplate tx;

    /** Les transactions de ce test sont validées : on vide la base partagée avec les autres tests. */
    @AfterEach
    void nettoyer() {
        materiaux.deleteAll();
    }

    @Test
    @DisplayName("UT-MAT-19 : une écriture sur une version périmée du stock est refusée (@Version)")
    void ecritureSurVersionPerimeeRefusee() {
        MateriauEntity ciment = MateriauEntityTest.ciment(100, 20);
        ciment.setReference("CIM-VERROU");
        Long id = materiaux.save(ciment).getId();
        MateriauEntity lecteurA = materiaux.findById(id).orElseThrow();
        MateriauEntity lecteurB = materiaux.findById(id).orElseThrow();

        lecteurA.sortir(30);
        tx.executeWithoutResult(s -> materiaux.save(lecteurA));
        lecteurB.sortir(50);

        assertThrows(OptimisticLockingFailureException.class,
                () -> tx.executeWithoutResult(s -> materiaux.save(lecteurB)));
        assertEquals(70, materiaux.findById(id).orElseThrow().getStock(),
                "la seconde sortie, faite sur un stock périmé, n'est pas appliquée");
    }
}
