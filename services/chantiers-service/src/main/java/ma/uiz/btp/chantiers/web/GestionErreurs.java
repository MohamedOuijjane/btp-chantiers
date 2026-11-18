package ma.uiz.btp.chantiers.web;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import ma.uiz.btp.chantiers.auth.IdentifiantsInvalidesException;
import ma.uiz.btp.chantiers.auth.TropDeTentativesException;
import ma.uiz.btp.chantiers.domain.RegleMetierException;
import ma.uiz.btp.chantiers.domain.RessourceIntrouvableException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Toutes les erreurs au format RFC 9457 (application/problem+json), message en français
 * dans detail. Les erreurs de validation portent en plus « erreurs » : { champ: message },
 * affiché sous chaque champ du formulaire. Hériter de ResponseEntityExceptionHandler donne
 * le même format aux erreurs de Spring MVC (paramètre invalide, JSON illisible…).
 */
@RestControllerAdvice
public class GestionErreurs extends ResponseEntityExceptionHandler {

    private static final String DONNEES_INVALIDES = "Données invalides";

    @ExceptionHandler(RessourceIntrouvableException.class)
    ProblemDetail introuvable(RessourceIntrouvableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(RegleMetierException.class)
    ProblemDetail regleMetier(RegleMetierException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    /** Connexion refusée : même message pour un e-mail inconnu et un mauvais mot de passe. */
    @ExceptionHandler(IdentifiantsInvalidesException.class)
    ResponseEntity<ProblemDetail> identifiantsInvalides(IdentifiantsInvalidesException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage()));
    }

    @ExceptionHandler(TropDeTentativesException.class)
    ResponseEntity<ProblemDetail> tropDeTentatives(TropDeTentativesException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(e.getAttenteSecondes()))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                        e.getMessage()));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        Map<String, String> champs = e.getBindingResult().getAllErrors().stream()
                .collect(Collectors.toMap(
                        err -> err instanceof FieldError fe ? fe.getField() : err.getObjectName(),
                        err -> String.valueOf(err.getDefaultMessage()),
                        (a, b) -> a,
                        LinkedHashMap::new));
        return erreurs(e, champs, headers, request);
    }

    /** JSON mal formé, ou valeur du mauvais type (date illisible, statut inconnu…). */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException e, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        if (e.getCause() instanceof MismatchedInputException mie && !mie.getPath().isEmpty()) {
            String champ = mie.getPath().get(mie.getPath().size() - 1).getFieldName();
            String message = mie instanceof InvalidFormatException ife
                    ? "Valeur invalide : " + ife.getValue()
                    : "Valeur invalide";
            return erreurs(e, Map.of(champ, message), headers, request);
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Corps de la requête illisible : JSON mal formé.");
        return handleExceptionInternal(e, pd, headers, HttpStatus.BAD_REQUEST, request);
    }

    /** Paramètre d'URL du mauvais type : /api/chantiers/abc, ?statut=INCONNU. */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException e, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        String nom = e instanceof MethodArgumentTypeMismatchException m
                ? m.getName()
                : e.getPropertyName();
        StringBuilder detail = new StringBuilder("Valeur invalide pour « ")
                .append(nom).append(" » : ").append(e.getValue());
        Class<?> type = e.getRequiredType();
        if (type != null && type.isEnum()) {
            String valeurs = Arrays.stream(type.getEnumConstants())
                    .map(String::valueOf)
                    .collect(Collectors.joining(", "));
            detail.append(" (valeurs possibles : ").append(valeurs).append(')');
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                detail.toString());
        return handleExceptionInternal(e, pd, headers, HttpStatus.BAD_REQUEST, request);
    }

    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException e, HttpHeaders headers, HttpStatusCode status,
            WebRequest request) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND,
                "Ressource introuvable");
        return handleExceptionInternal(e, pd, headers, HttpStatus.NOT_FOUND, request);
    }

    private ResponseEntity<Object> erreurs(Exception e, Map<String, String> champs,
                                           HttpHeaders headers, WebRequest request) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                DONNEES_INVALIDES);
        pd.setProperty("erreurs", champs);
        return handleExceptionInternal(e, pd, headers, HttpStatus.BAD_REQUEST, request);
    }
}
