package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Matériau ou chantier inconnu : faute SOAP Client. */
@SoapFault(faultCode = FaultCode.CLIENT)
public class IntrouvableException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP. */
    public IntrouvableException(String message) {
        super(message);
    }
}
