package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Mouvement vers un chantier terminé : faute SOAP Client. */
@SoapFault(faultCode = FaultCode.CLIENT)
public class ChantierTermineException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP. */
    public ChantierTermineException(String message) {
        super(message);
    }
}
