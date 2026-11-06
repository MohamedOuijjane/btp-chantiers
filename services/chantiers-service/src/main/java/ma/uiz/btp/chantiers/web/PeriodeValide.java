package ma.uiz.btp.chantiers.web;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * RG-01 : la date de fin prévue est postérieure ou égale à la date de début.
 * L'erreur est rattachée au champ dateFinPrevue, pour que le formulaire l'affiche sous ce champ.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PeriodeValide.Validateur.class)
public @interface PeriodeValide {

    /** Message affiché sous le champ dateFinPrevue. */
    String message() default
            "La date de fin prévue doit être postérieure ou égale à la date de début";

    /** Groupes de validation (non utilisés). */
    Class<?>[] groups() default {};

    /** Métadonnées de la contrainte (non utilisées). */
    Class<? extends Payload>[] payload() default {};

    /** Vérifie la période et rattache l'erreur au champ dateFinPrevue. */
    class Validateur implements ConstraintValidator<PeriodeValide, ChantierDto.Requete> {

        @Override
        public boolean isValid(ChantierDto.Requete r, ConstraintValidatorContext context) {
            if (r == null || r.dateDebut() == null || r.dateFinPrevue() == null
                    || !r.dateFinPrevue().isBefore(r.dateDebut())) {
                return true;
            }
            context.disableDefaultConstraintViolation();
            String message = context.getDefaultConstraintMessageTemplate();
            context.buildConstraintViolationWithTemplate(message)
                    .addPropertyNode("dateFinPrevue")
                    .addConstraintViolation();
            return false;
        }
    }
}
