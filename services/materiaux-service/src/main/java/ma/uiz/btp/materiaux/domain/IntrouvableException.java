package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Matériau ou chantier inconnu : faute SOAP Introuvable (404 côté front, #145). */
@SoapFault(faultCode = FaultCode.CUSTOM, customFaultCode = FautesMateriaux.INTROUVABLE)
public class IntrouvableException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP. */
    public IntrouvableException(String message) {
        super(message);
    }
}
