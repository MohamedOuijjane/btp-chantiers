package ma.uiz.btp.chantiers.web;

import jakarta.validation.constraints.*;
import ma.uiz.btp.chantiers.domain.Chantier;
import ma.uiz.btp.chantiers.domain.StatutChantier;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Objets d'échange de l'API (on n'expose jamais l'entité JPA directement). */
public final class ChantierDto {

    private ChantierDto() {}

    public record Requete(
            @NotBlank @Size(max = 150) String nom,
            @NotBlank String adresse,
            @NotBlank @Size(max = 150) String client,
            @NotNull LocalDate dateDebut,
            @NotNull LocalDate dateFinPrevue,
            @NotNull @PositiveOrZero BigDecimal budget,
            StatutChantier statut) {

        @AssertTrue(message = "dateFinPrevue doit être postérieure ou égale à dateDebut")
        public boolean isPeriodeValide() {
            return dateDebut == null || dateFinPrevue == null || !dateFinPrevue.isBefore(dateDebut);
        }
    }

    public record Reponse(
            Long id, String nom, String adresse, String client,
            LocalDate dateDebut, LocalDate dateFinPrevue, BigDecimal budget, StatutChantier statut) {

        public static Reponse de(Chantier c) {
            return new Reponse(c.getId(), c.getNom(), c.getAdresse(), c.getClient(),
                    c.getDateDebut(), c.getDateFinPrevue(), c.getBudget(), c.getStatut());
        }
    }

    /** Avancement agrégé à partir du module Tâches. */
    public record Avancement(Long chantierId, Integer nombreTaches, Double avancementGlobal, boolean sourceDisponible) {}
}
