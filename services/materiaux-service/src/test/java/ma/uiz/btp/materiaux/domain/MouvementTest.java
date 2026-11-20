package ma.uiz.btp.materiaux.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Le mouvement expose le stock et l'alerte du matériau, pas l'entité elle-même (SpotBugs EI_EXPOSE_REP). */
class MouvementTest {

    @Test
    @DisplayName("UT-MAT-14 : le mouvement porte le chantier, le type, la quantité et une date")
    void champsDuMouvement() {
        Mouvement mv = new Mouvement(MateriauEntityTest.ciment(100, 20), 7L, Mouvement.Type.SORTIE, 30);

        assertNull(mv.getId());
        assertEquals(7L, mv.getChantierId());
        assertEquals(Mouvement.Type.SORTIE, mv.getType());
        assertEquals(30, mv.getQuantite());
        assertNotNull(mv.getDate());
    }

    @Test
    @DisplayName("UT-MAT-15 : stock après mouvement et alerte lus sur le matériau du mouvement")
    void stockEtAlerteApresMouvement() {
        MateriauEntity m = MateriauEntityTest.ciment(100, 20);
        Mouvement mv = new Mouvement(m, 7L, Mouvement.Type.SORTIE, 30);
        m.sortir(30);

        assertEquals(70, mv.getStockApresMouvement());
        assertFalse(mv.isMateriauEnAlerte());

        m.sortir(50);
        assertEquals(20, mv.getStockApresMouvement());
        assertTrue(mv.isMateriauEnAlerte());
    }
}
