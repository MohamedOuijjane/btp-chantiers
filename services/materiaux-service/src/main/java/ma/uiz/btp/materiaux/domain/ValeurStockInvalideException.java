package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Quantité, stock ou seuil invalide (négatif, nul ou non fini) : faute SOAP Client. */
@SoapFault(faultCode = FaultCode.CLIENT)
public class ValeurStockInvalideException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP. */
    public ValeurStockInvalideException(String message) {
        super(message);
    }
}
