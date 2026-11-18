package ma.uiz.btp.chantiers.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import ma.uiz.btp.chantiers.client.TachesClient;
import ma.uiz.btp.chantiers.client.TachesClient.TacheResume;
import ma.uiz.btp.chantiers.domain.Chantier;
import ma.uiz.btp.chantiers.domain.ChantierRepository;
import ma.uiz.btp.chantiers.domain.RegleMetierException;
import ma.uiz.btp.chantiers.domain.RessourceIntrouvableException;
import ma.uiz.btp.chantiers.domain.StatutChantier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Tests unitaires de la couche service du module Chantiers.
 * Le repository et le client du module Tâches sont simulés : ni serveur, ni base de données.
 */
@ExtendWith(MockitoExtension.class)
class ChantierServiceTest {

    private static final LocalDate DEBUT = LocalDate.of(2026, 11, 2);
    private static final LocalDate FIN = LocalDate.of(2027, 6, 30);

    @Mock
    private ChantierRepository repository;

    @Mock
    private TachesClient tachesClient;

    @InjectMocks
    private ChantierService service;

    private static ChantierDto.Requete requete(LocalDate debut, LocalDate fin, BigDecimal budget,
                                               StatutChantier statut) {
        return new ChantierDto.Requete("Résidence Al Amal", "Hay Mohammadi, Agadir", "Copropriété Al Amal",
                debut, fin, budget, statut);
    }

    private static ChantierDto.Requete requeteValide() {
        return requete(DEBUT, FIN, new BigDecimal("4800000.00"), null);
    }

    private static Chantier chantierExistant(StatutChantier statut) {
        Chantier c = new Chantier();
        c.setNom("Groupe scolaire Anza");
        c.setAdresse("Anza, Agadir");
        c.setClient("Fondation Tazrout");
        c.setDateDebut(DEBUT);
        c.setDateFinPrevue(FIN);
        c.setBudget(new BigDecimal("3200000.00"));
        c.setStatut(statut);
        return c;
    }

    @Nested
    @DisplayName("creer")
    class Creer {

        @Test
        @DisplayName("UT-CHA-01 : crée un chantier valide au statut PLANIFIE")
        void creeUnChantierValideAuStatutPlanifie() {
            // Arrange
            when(repository.save(any(Chantier.class))).thenAnswer(inv -> inv.getArgument(0));

            // Act
            Chantier cree = service.creer(requeteValide());

            // Assert
            assertNotNull(cree);
            assertEquals("Résidence Al Amal", cree.getNom());
            assertEquals(DEBUT, cree.getDateDebut());
            assertEquals(FIN, cree.getDateFinPrevue());
            assertEquals(new BigDecimal("4800000.00"), cree.getBudget());
            assertEquals(StatutChantier.PLANIFIE, cree.getStatut());
            verify(repository).save(cree);
        }

        @Test
        @DisplayName("UT-CHA-02 : ignore le statut envoyé à la création")
        void ignoreLeStatutEnvoyeALaCreation() {
            // Arrange
            when(repository.save(any(Chantier.class))).thenAnswer(inv -> inv.getArgument(0));
            ChantierDto.Requete r = requete(DEBUT, FIN, new BigDecimal("1000.00"), StatutChantier.EN_COURS);

            // Act
            Chantier cree = service.creer(r);

            // Assert
            assertEquals(StatutChantier.PLANIFIE, cree.getStatut());
        }

        @Test
        @DisplayName("UT-CHA-03 : accepte une date de fin égale à la date de début et un budget nul")
        void accepteUnChantierDUnJourEtUnBudgetNul() {
            // Arrange
            when(repository.save(any(Chantier.class))).thenAnswer(inv -> inv.getArgument(0));
            ChantierDto.Requete r = requete(DEBUT, DEBUT, BigDecimal.ZERO, null);

            // Act
            Chantier cree = service.creer(r);

            // Assert
            assertEquals(cree.getDateDebut(), cree.getDateFinPrevue());
            assertEquals(0, BigDecimal.ZERO.compareTo(cree.getBudget()));
            verify(repository).save(cree);
        }

        @Test
        @DisplayName("UT-CHA-04 : refuse une date de fin antérieure à la date de début")
        void refuseUneDateDeFinAnterieureALaDateDeDebut() {
            // Arrange
            ChantierDto.Requete r = requete(FIN, DEBUT, new BigDecimal("1000.00"), null);

            // Act
            RegleMetierException e = assertThrows(RegleMetierException.class, () -> service.creer(r));

            // Assert
            assertTrue(e.getMessage().contains("date de fin"));
            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("UT-CHA-05 : refuse un budget négatif")
        void refuseUnBudgetNegatif() {
            // Arrange
            ChantierDto.Requete r = requete(DEBUT, FIN, new BigDecimal("-1.00"), null);

            // Act
            RegleMetierException e = assertThrows(RegleMetierException.class, () -> service.creer(r));

            // Assert
            assertTrue(e.getMessage().contains("budget"));
            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("UT-CHA-06 : refuse un chantier sans date de début")
        void refuseUnChantierSansDateDeDebut() {
            // Arrange
            ChantierDto.Requete r = requete(null, FIN, new BigDecimal("1000.00"), null);

            // Act
            RegleMetierException e = assertThrows(RegleMetierException.class, () -> service.creer(r));

            // Assert
            assertTrue(e.getMessage().contains("obligatoires"));
            verify(repository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("trouver et lister")
    class TrouverEtLister {

        @Test
        @DisplayName("UT-CHA-07 : renvoie le chantier demandé")
        void renvoieLeChantierDemande() {
            // Arrange
            Chantier existant = chantierExistant(StatutChantier.EN_COURS);
            when(repository.findById(1L)).thenReturn(Optional.of(existant));

            // Act
            Chantier trouve = service.trouver(1L);

            // Assert
            assertSame(existant, trouve);
            verify(repository).findById(1L);
        }

        @Test
        @DisplayName("UT-CHA-08 : lève une erreur pour un chantier introuvable")
        void leveUneErreurPourUnChantierIntrouvable() {
            // Arrange
            when(repository.findById(99L)).thenReturn(Optional.empty());

            // Act
            RessourceIntrouvableException e =
                    assertThrows(RessourceIntrouvableException.class, () -> service.trouver(99L));

            // Assert
            assertEquals("Chantier 99 introuvable", e.getMessage());
        }

        @Test
        @DisplayName("UT-CHA-09 : liste tous les chantiers quand aucun statut n'est donné")
        void listeTousLesChantiersSansStatut() {
            // Arrange
            List<Chantier> tous = List.of(chantierExistant(StatutChantier.PLANIFIE),
                    chantierExistant(StatutChantier.EN_COURS));
            when(repository.findAll()).thenReturn(tous);

            // Act
            List<Chantier> resultat = service.lister(null);

            // Assert
            assertEquals(2, resultat.size());
            verify(repository).findAll();
            verify(repository, never()).findByStatut(any());
        }

        @Test
        @DisplayName("UT-CHA-10 : renvoie une liste vide quand aucun chantier n'a le statut demandé")
        void renvoieUneListeVidePourUnStatutSansChantier() {
            // Arrange
            when(repository.findByStatut(StatutChantier.SUSPENDU)).thenReturn(List.of());

            // Act
            List<Chantier> resultat = service.lister(StatutChantier.SUSPENDU);

            // Assert
            assertTrue(resultat.isEmpty());
            verify(repository).findByStatut(StatutChantier.SUSPENDU);
            verify(repository, never()).findAll();
        }
    }

    @Nested
    @DisplayName("modifier")
    class Modifier {

        @Test
        @DisplayName("UT-CHA-11 : modifie un chantier et conserve son statut si aucun n'est envoyé")
        void modifieUnChantierEtConserveSonStatut() {
            // Arrange
            Chantier existant = chantierExistant(StatutChantier.EN_COURS);
            when(repository.findById(1L)).thenReturn(Optional.of(existant));
            ChantierDto.Requete r = requete(DEBUT, FIN.plusMonths(2), new BigDecimal("3500000.00"), null);

            // Act
            Chantier modifie = service.modifier(1L, r);

            // Assert
            assertEquals("Résidence Al Amal", modifie.getNom());
            assertEquals(FIN.plusMonths(2), modifie.getDateFinPrevue());
            assertEquals(StatutChantier.EN_COURS, modifie.getStatut());
        }

        @Test
        @DisplayName("UT-CHA-12 : refuse de modifier un chantier terminé")
        void refuseDeModifierUnChantierTermine() {
            // Arrange
            Chantier termine = chantierExistant(StatutChantier.TERMINE);
            when(repository.findById(1L)).thenReturn(Optional.of(termine));

            // Act
            assertThrows(RegleMetierException.class, () -> service.modifier(1L, requeteValide()));

            // Assert
            assertEquals("Groupe scolaire Anza", termine.getNom());
        }

        @Test
        @DisplayName("UT-CHA-13 : refuse le passage à TERMINE par modification")
        void refuseLePassageATermineParModification() {
            // Arrange
            Chantier existant = chantierExistant(StatutChantier.EN_COURS);
            when(repository.findById(1L)).thenReturn(Optional.of(existant));
            ChantierDto.Requete r = requete(DEBUT, FIN, new BigDecimal("1000.00"), StatutChantier.TERMINE);

            // Act
            RegleMetierException e = assertThrows(RegleMetierException.class, () -> service.modifier(1L, r));

            // Assert
            assertTrue(e.getMessage().contains("cloture"));
            assertEquals(StatutChantier.EN_COURS, existant.getStatut());
        }

        @Test
        @DisplayName("UT-CHA-14 : refuse une modification avec une date de fin antérieure à la date de début")
        void refuseUneModificationAvecDesDatesIncoherentes() {
            // Arrange
            Chantier existant = chantierExistant(StatutChantier.PLANIFIE);
            when(repository.findById(1L)).thenReturn(Optional.of(existant));
            ChantierDto.Requete r = requete(FIN, DEBUT, new BigDecimal("1000.00"), null);

            // Act
            assertThrows(RegleMetierException.class, () -> service.modifier(1L, r));

            // Assert
            assertEquals(DEBUT, existant.getDateDebut());
            assertEquals(FIN, existant.getDateFinPrevue());
        }
    }

    @Nested
    @DisplayName("cloturer et supprimer")
    class CloturerEtSupprimer {

        @Test
        @DisplayName("UT-CHA-15 : clôture un chantier en cours")
        void clotureUnChantierEnCours() {
            // Arrange
            when(repository.findById(1L)).thenReturn(Optional.of(chantierExistant(StatutChantier.EN_COURS)));

            // Act
            Chantier cloture = service.cloturer(1L);

            // Assert
            assertEquals(StatutChantier.TERMINE, cloture.getStatut());
        }

        @Test
        @DisplayName("UT-CHA-16 : refuse de clôturer un chantier déjà terminé")
        void refuseDeCloturerUnChantierDejaTermine() {
            // Arrange
            when(repository.findById(1L)).thenReturn(Optional.of(chantierExistant(StatutChantier.TERMINE)));

            // Act + Assert
            assertThrows(RegleMetierException.class, () -> service.cloturer(1L));
        }

        @Test
        @DisplayName("UT-CHA-17 : supprime un chantier existant")
        void supprimeUnChantierExistant() {
            // Arrange
            Chantier existant = chantierExistant(StatutChantier.PLANIFIE);
            when(repository.findById(1L)).thenReturn(Optional.of(existant));

            // Act
            service.supprimer(1L);

            // Assert
            verify(repository).delete(existant);
        }

        @Test
        @DisplayName("UT-CHA-18 : ne supprime rien si le chantier est introuvable")
        void neSupprimeRienSiLeChantierEstIntrouvable() {
            // Arrange
            when(repository.findById(99L)).thenReturn(Optional.empty());

            // Act
            assertThrows(RessourceIntrouvableException.class, () -> service.supprimer(99L));

            // Assert
            verify(repository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("avancement")
    class Avancement {

        @Test
        @DisplayName("UT-CHA-19 : calcule la moyenne des avancements des tâches, arrondie au dixième")
        void calculeLaMoyenneDesAvancements() {
            // Arrange
            when(repository.findById(1L)).thenReturn(Optional.of(chantierExistant(StatutChantier.EN_COURS)));
            when(tachesClient.tachesDuChantier(1L)).thenReturn(Optional.of(List.of(
                    new TacheResume("1", "Fondations", "TERMINEE", 40),
                    new TacheResume("2", "Gros œuvre", "EN_COURS", 50),
                    new TacheResume("3", "Charpente", "EN_COURS", 65))));

            // Act
            ChantierDto.Avancement a = service.avancement(1L);

            // Assert
            assertEquals(1L, a.chantierId());
            assertEquals(3, a.nombreTaches());
            assertEquals(51.7, a.avancementGlobal());
            assertTrue(a.sourceDisponible());
        }

        @Test
        @DisplayName("UT-CHA-20 : renvoie 0 % pour un chantier sans tâche")
        void renvoieZeroPourUnChantierSansTache() {
            // Arrange
            when(repository.findById(1L)).thenReturn(Optional.of(chantierExistant(StatutChantier.PLANIFIE)));
            when(tachesClient.tachesDuChantier(1L)).thenReturn(Optional.of(List.of()));

            // Act
            ChantierDto.Avancement a = service.avancement(1L);

            // Assert
            assertEquals(0, a.nombreTaches());
            assertEquals(0.0, a.avancementGlobal());
            assertTrue(a.sourceDisponible());
        }

        @Test
        @DisplayName("UT-CHA-21 : renvoie une réponse dégradée si le module Tâches est indisponible")
        void renvoieUneReponseDegradeeSiTachesIndisponible() {
            // Arrange
            when(repository.findById(1L)).thenReturn(Optional.of(chantierExistant(StatutChantier.EN_COURS)));
            when(tachesClient.tachesDuChantier(1L)).thenReturn(Optional.empty());

            // Act
            ChantierDto.Avancement a = service.avancement(1L);

            // Assert
            assertEquals(1L, a.chantierId());
            assertEquals(0, a.nombreTaches());
            assertNull(a.avancementGlobal());
            assertFalse(a.sourceDisponible());
        }

        @Test
        @DisplayName("UT-CHA-22 : n'interroge pas le module Tâches pour un chantier introuvable")
        void ninterrogePasTachesPourUnChantierIntrouvable() {
            // Arrange
            when(repository.findById(99L)).thenReturn(Optional.empty());

            // Act
            assertThrows(RessourceIntrouvableException.class, () -> service.avancement(99L));

            // Assert
            verifyNoInteractions(tachesClient);
        }
    }
}
