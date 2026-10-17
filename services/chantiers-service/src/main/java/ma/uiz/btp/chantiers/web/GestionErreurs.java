package ma.uiz.btp.chantiers.web;

import ma.uiz.btp.chantiers.domain.RegleMetierException;
import ma.uiz.btp.chantiers.domain.RessourceIntrouvableException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/** Erreurs au format standard RFC 9457 (application/problem+json). */
@RestControllerAdvice
public class GestionErreurs {

    @ExceptionHandler(RessourceIntrouvableException.class)
    ProblemDetail introuvable(RessourceIntrouvableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(RegleMetierException.class)
    ProblemDetail regleMetier(RegleMetierException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail validation(MethodArgumentNotValidException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Requête invalide");
        Map<String, String> champs = e.getBindingResult().getAllErrors().stream()
                .collect(Collectors.toMap(
                        err -> err instanceof org.springframework.validation.FieldError fe ? fe.getField() : err.getObjectName(),
                        err -> String.valueOf(err.getDefaultMessage()),
                        (a, b) -> a));
        pd.setProperty("erreurs", champs);
        return pd;
    }
}
