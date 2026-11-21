package ma.uiz.btp.materiaux.ws;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import ma.uiz.btp.materiaux.client.ChantiersClient;
import ma.uiz.btp.materiaux.domain.ChantierTermineException;
import ma.uiz.btp.materiaux.domain.ChantiersIndisponibleException;
import ma.uiz.btp.materiaux.domain.IntrouvableException;
import ma.uiz.btp.materiaux.domain.MateriauEntity;
import ma.uiz.btp.materiaux.domain.MateriauRepository;
import ma.uiz.btp.materiaux.domain.Mouvement;
import ma.uiz.btp.materiaux.domain.MouvementRepository;
import ma.uiz.btp.materiaux.domain.StockInsuffisantException;
import ma.uiz.btp.materiaux.domain.ValeurStockInvalideException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Service Matériaux : dépôts et client Chantiers simulés (ni base, ni réseau). */
@ExtendWith(MockitoExtension.class)
class MateriauServiceTest {

    @Mock MateriauRepository materiaux;
    @Mock MouvementRepository mouvements;
    @Mock ChantiersClient chantiers;
    @InjectMocks MateriauService service;

    private static MateriauEntity ciment(double stock, double seuil) {
        MateriauEntity m = new MateriauEntity();
        m.setReference("CIM-01");
        m.setNom("Ciment CPJ45");
        m.setUnite("sac");
        m.setStock(stock);
        m.setSeuilAlerte(seuil);
        return m;
    }

    @Nested
    @DisplayName("enregistrerMouvement")
    class EnregistrerMouvement {

        @Test
        @DisplayName("UT-MAT-20 : sortie enregistrée, après vérification du chantier, stock diminué")
        void sortieEnregistree() {
            MateriauEntity m = ciment(100, 20);
            when(materiaux.findById(1L)).thenReturn(Optional.of(m));
            when(mouvements.save(any())).thenAnswer(i -> i.getArgument(0));

            Mouvement mv = service.enregistrerMouvement(1L, 7L, Mouvement.Type.SORTIE, 30);

            InOrder ordre = inOrder(chantiers, materiaux, mouvements);
            ordre.verify(chantiers).verifierChantierActif(7L);
            ordre.verify(materiaux).findById(1L);
            ordre.verify(mouvements).save(mv);
            assertEquals(70, m.getStock());
            assertEquals(70, mv.getStockApresMouvement());
            assertEquals(Mouvement.Type.SORTIE, mv.getType());
            assertEquals(7L, mv.getChantierId());
        }

        @Test
        @DisplayName("UT-MAT-21 : entrée enregistrée, stock augmenté")
        void entreeEnregistree() {
            MateriauEntity m = ciment(10, 20);
            when(materiaux.findById(1L)).thenReturn(Optional.of(m));
            when(mouvements.save(any())).thenAnswer(i -> i.getArgument(0));

            Mouvement mv = service.enregistrerMouvement(1L, 7L, Mouvement.Type.ENTREE, 15);

            assertEquals(25, m.getStock());
            assertFalse(mv.isMateriauEnAlerte());
        }

        @Test
        @DisplayName("UT-MAT-22 : chantier terminé, rien n'est lu ni enregistré")
        void chantierTermine() {
            doThrow(new ChantierTermineException("Le chantier 7 est terminé"))
                    .when(chantiers).verifierChantierActif(7L);

            assertThrows(ChantierTermineException.class,
                    () -> service.enregistrerMouvement(1L, 7L, Mouvement.Type.SORTIE, 30));
            verifyNoInteractions(materiaux, mouvements);
        }

        @Test
        @DisplayName("UT-MAT-23 : Chantiers indisponible, rien n'est lu ni enregistré")
        void chantiersIndisponible() {
            doThrow(new ChantiersIndisponibleException("Échec de l'appel au service Chantiers."))
                    .when(chantiers).verifierChantierActif(7L);

            assertThrows(ChantiersIndisponibleException.class,
                    () -> service.enregistrerMouvement(1L, 7L, Mouvement.Type.ENTREE, 30));
            verifyNoInteractions(materiaux, mouvements);
        }

        @Test
        @DisplayName("UT-MAT-24 : matériau introuvable, aucun mouvement")
        void materiauIntrouvable() {
            when(materiaux.findById(99L)).thenReturn(Optional.empty());

            IntrouvableException e = assertThrows(IntrouvableException.class,
                    () -> service.enregistrerMouvement(99L, 7L, Mouvement.Type.SORTIE, 1));
            assertEquals("Matériau 99 introuvable", e.getMessage());
            verify(mouvements, never()).save(any());
        }

        @Test
        @DisplayName("UT-MAT-25 : stock insuffisant, aucun mouvement et stock inchangé")
        void stockInsuffisant() {
            MateriauEntity m = ciment(10, 5);
            when(materiaux.findById(1L)).thenReturn(Optional.of(m));

            assertThrows(StockInsuffisantException.class,
                    () -> service.enregistrerMouvement(1L, 7L, Mouvement.Type.SORTIE, 11));
            assertEquals(10, m.getStock());
            verify(mouvements, never()).save(any());
        }

        @Test
        @DisplayName("UT-MAT-26 : quantité nulle refusée, aucun mouvement")
        void quantiteNulle() {
            when(materiaux.findById(1L)).thenReturn(Optional.of(ciment(10, 5)));

            assertThrows(ValeurStockInvalideException.class,
                    () -> service.enregistrerMouvement(1L, 7L, Mouvement.Type.ENTREE, 0));
            verify(mouvements, never()).save(any());
        }
    }

    @Nested
    @DisplayName("listerMouvements (#18)")
    class ListerMouvements {

        private final List<Mouvement> resultat =
                List.of(new Mouvement(ciment(10, 5), 7L, Mouvement.Type.SORTIE, 2));

        @Test
        @DisplayName("UT-MAT-50 : sans filtre, tous les mouvements")
        void sansFiltre() {
            when(mouvements.tous()).thenReturn(resultat);
            assertSame(resultat, service.listerMouvements(null, null));
        }

        @Test
        @DisplayName("UT-MAT-51 : filtre par chantier")
        void parChantier() {
            when(mouvements.parChantier(7L)).thenReturn(resultat);
            assertSame(resultat, service.listerMouvements(7L, null));
        }

        @Test
        @DisplayName("UT-MAT-52 : filtre par matériau")
        void parMateriau() {
            when(mouvements.parMateriau(1L)).thenReturn(resultat);
            assertSame(resultat, service.listerMouvements(null, 1L));
        }

        @Test
        @DisplayName("UT-MAT-53 : filtres chantier et matériau combinés")
        void parChantierEtMateriau() {
            when(mouvements.parChantierEtMateriau(7L, 1L))
                    .thenReturn(resultat);
            assertSame(resultat, service.listerMouvements(7L, 1L));
            verifyNoInteractions(chantiers);
        }
    }

    @Nested
    @DisplayName("lecture")
    class Lecture {

        @Test
        @DisplayName("UT-MAT-27 : lister tous les matériaux ou seulement ceux en alerte")
        void lister() {
            List<MateriauEntity> tous = List.of(ciment(100, 20), ciment(5, 20));
            List<MateriauEntity> alerte = List.of(tous.get(1));
            when(materiaux.findAll()).thenReturn(tous);
            when(materiaux.findEnAlerte()).thenReturn(alerte);

            assertSame(tous, service.lister(false));
            assertSame(alerte, service.lister(true));
        }

        @Test
        @DisplayName("UT-MAT-28 : stockSuffisant et trouver")
        void stockSuffisantEtTrouver() {
            MateriauEntity m = ciment(40, 10);
            when(materiaux.findById(1L)).thenReturn(Optional.of(m));

            assertTrue(service.stockSuffisant(1L, 40));
            assertFalse(service.stockSuffisant(1L, 41));
            assertSame(m, service.trouver(1L));
        }

        @Test
        @DisplayName("UT-MAT-29 : ajouter enregistre le matériau")
        void ajouter() {
            MateriauEntity m = ciment(40, 10);
            when(materiaux.save(m)).thenReturn(m);

            assertSame(m, service.ajouter(m));
        }
    }
}
