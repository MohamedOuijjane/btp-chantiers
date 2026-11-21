package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Module Chantiers injoignable ou réponse inattendue : faute SOAP Server. */
@SoapFault(faultCode = FaultCode.SERVER)
public class ChantiersIndisponibleException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP. */
    public ChantiersIndisponibleException(String message) {
        super(message);
    }

    /** Crée l'exception avec le message renvoyé dans la faute SOAP et la cause technique. */
    public ChantiersIndisponibleException(String message, Throwable cause) {
        super(message, cause);
    }
}
