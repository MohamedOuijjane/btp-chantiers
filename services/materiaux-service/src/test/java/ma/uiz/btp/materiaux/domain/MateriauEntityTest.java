package ma.uiz.btp.materiaux.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Règles de stock du matériau : sorties, entrées, alerte et valeurs invalides. */
class MateriauEntityTest {

    static MateriauEntity ciment(double stock, double seuil) {
        MateriauEntity m = new MateriauEntity();
        m.setReference("CIM-01");
        m.setNom("Ciment CPJ45");
        m.setUnite("sac");
        m.setStock(stock);
        m.setSeuilAlerte(seuil);
        return m;
    }

    @Nested
    @DisplayName("sortir")
    class Sortir {

        @Test
        @DisplayName("UT-MAT-01 : une sortie diminue le stock")
        void diminueLeStock() {
            MateriauEntity m = ciment(100, 20);
            m.sortir(30);
            assertEquals(70, m.getStock());
        }

        @Test
        @DisplayName("UT-MAT-02 : une sortie égale au stock le ramène à zéro (cas limite)")
        void sortieEgaleAuStock() {
            MateriauEntity m = ciment(50, 10);
            m.sortir(50);
            assertEquals(0, m.getStock());
            assertTrue(m.isEnAlerte());
        }

        @Test
        @DisplayName("UT-MAT-03 : une sortie supérieure au stock est refusée et ne change rien")
        void sortieSuperieureAuStockRefusee() {
            MateriauEntity m = ciment(50, 10);
            StockInsuffisantException e = assertThrows(StockInsuffisantException.class, () -> m.sortir(50.5));
            assertEquals("Stock insuffisant pour CIM-01 : disponible 50.0, demandé 50.5", e.getMessage());
            assertEquals(50, m.getStock());
        }

        @ParameterizedTest(name = "UT-MAT-04 : quantité {0} refusée")
        @ValueSource(doubles = {0, -1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
        void quantiteInvalideRefusee(double quantite) {
            MateriauEntity m = ciment(50, 10);
            assertThrows(ValeurStockInvalideException.class, () -> m.sortir(quantite));
            assertEquals(50, m.getStock());
        }
    }

    @Nested
    @DisplayName("entrer")
    class Entrer {

        @Test
        @DisplayName("UT-MAT-05 : une entrée augmente le stock et peut sortir de l'alerte")
        void augmenteLeStock() {
            MateriauEntity m = ciment(10, 20);
            assertTrue(m.isEnAlerte());
            m.entrer(15);
            assertEquals(25, m.getStock());
            assertFalse(m.isEnAlerte());
        }

        @ParameterizedTest(name = "UT-MAT-06 : quantité {0} refusée")
        @ValueSource(doubles = {0, -5, Double.NaN, Double.POSITIVE_INFINITY})
        void quantiteInvalideRefusee(double quantite) {
            MateriauEntity m = ciment(10, 20);
            assertThrows(ValeurStockInvalideException.class, () -> m.entrer(quantite));
            assertEquals(10, m.getStock());
        }

        @Test
        @DisplayName("UT-MAT-07 : une entrée qui rendrait le stock infini est refusée")
        void stockInfiniRefuse() {
            MateriauEntity m = ciment(Double.MAX_VALUE, 0);
            assertThrows(ValeurStockInvalideException.class, () -> m.entrer(Double.MAX_VALUE));
            assertEquals(Double.MAX_VALUE, m.getStock());
        }
    }

    @Nested
    @DisplayName("stock suffisant et alerte")
    class StockSuffisantEtAlerte {

        @Test
        @DisplayName("UT-MAT-08 : stock suffisant si la quantité est inférieure ou égale au stock")
        void stockSuffisant() {
            MateriauEntity m = ciment(40, 10);
            assertTrue(m.stockSuffitPour(39.9));
            assertTrue(m.stockSuffitPour(40));
            assertFalse(m.stockSuffitPour(40.1));
        }

        @ParameterizedTest(name = "UT-MAT-09 : vérification avec la quantité {0} refusée")
        @ValueSource(doubles = {0, -1, Double.NaN})
        void verificationQuantiteInvalide(double quantite) {
            assertThrows(ValeurStockInvalideException.class, () -> ciment(40, 10).stockSuffitPour(quantite));
        }

        @Test
        @DisplayName("UT-MAT-10 : en alerte quand le stock est égal au seuil (cas limite)")
        void alerteAuSeuil() {
            assertTrue(ciment(20, 20).isEnAlerte());
            assertTrue(ciment(19, 20).isEnAlerte());
            assertFalse(ciment(20.5, 20).isEnAlerte());
        }
    }

    @Nested
    @DisplayName("valeurs saisies")
    class ValeursSaisies {

        @ParameterizedTest(name = "UT-MAT-11 : stock {0} refusé")
        @ValueSource(doubles = {-0.5, Double.NaN, Double.POSITIVE_INFINITY})
        void stockInvalide(double stock) {
            MateriauEntity m = ciment(10, 5);
            assertThrows(ValeurStockInvalideException.class, () -> m.setStock(stock));
            assertEquals(10, m.getStock());
        }

        @ParameterizedTest(name = "UT-MAT-12 : seuil {0} refusé")
        @ValueSource(doubles = {-1, Double.NaN, Double.NEGATIVE_INFINITY})
        void seuilInvalide(double seuil) {
            MateriauEntity m = ciment(10, 5);
            assertThrows(ValeurStockInvalideException.class, () -> m.setSeuilAlerte(seuil));
            assertEquals(5, m.getSeuilAlerte());
        }

        @Test
        @DisplayName("UT-MAT-13 : stock et seuil à zéro acceptés (cas limite)")
        void zeroAccepte() {
            MateriauEntity m = ciment(0, 0);
            assertEquals(0, m.getStock());
            assertEquals(0, m.getSeuilAlerte());
            assertEquals("CIM-01", m.getReference());
            assertEquals("Ciment CPJ45", m.getNom());
            assertEquals("sac", m.getUnite());
        }
    }
}
