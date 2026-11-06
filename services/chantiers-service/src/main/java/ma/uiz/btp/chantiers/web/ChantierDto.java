package ma.uiz.btp.chantiers.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import ma.uiz.btp.chantiers.domain.Chantier;
import ma.uiz.btp.chantiers.domain.StatutChantier;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Objets d'échange de l'API (on n'expose jamais l'entité JPA directement). */
public final class ChantierDto {

    private ChantierDto() {}

    /** Corps de POST et PUT. Les messages de validation s'affichent sous les champs du formulaire. */
    @PeriodeValide
    public record Requete(
            @NotBlank(message = "Le nom est obligatoire")
            @Size(max = 150, message = "Le nom ne doit pas dépasser 150 caractères") String nom,
            @NotBlank(message = "L'adresse est obligatoire") String adresse,
            @NotBlank(message = "Le client est obligatoire")
            @Size(max = 150, message = "Le client ne doit pas dépasser 150 caractères") String client,
            @NotNull(message = "La date de début est obligatoire") LocalDate dateDebut,
            @NotNull(message = "La date de fin prévue est obligatoire") LocalDate dateFinPrevue,
            @NotNull(message = "Le budget est obligatoire")
            @PositiveOrZero(message = "Le budget doit être positif ou nul") BigDecimal budget,
            @Schema(description = "Ignoré à la création (toujours PLANIFIE). En modification : PLANIFIE, EN_COURS ou SUSPENDU ; "
                    + "TERMINE est refusé (409), utiliser PATCH /api/chantiers/{id}/cloture.")
            StatutChantier statut) {
    }

    public record Reponse(
            Long id, String nom, String adresse, String client,
            LocalDate dateDebut, LocalDate dateFinPrevue, BigDecimal budget, StatutChantier statut) {

        public static Reponse de(Chantier c) {
            return new Reponse(c.getId(), c.getNom(), c.getAdresse(), c.getClient(),
                    c.getDateDebut(), c.getDateFinPrevue(), c.getBudget(), c.getStatut());
        }
    }

    /**
     * Avancement agrégé à partir du module Tâches. Tous les champs sont toujours présents :
     * en mode dégradé (Tâches injoignable), nombreTaches vaut 0 et avancementGlobal vaut null.
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Avancement(
            Long chantierId, int nombreTaches, Double avancementGlobal, boolean sourceDisponible) {}
}
