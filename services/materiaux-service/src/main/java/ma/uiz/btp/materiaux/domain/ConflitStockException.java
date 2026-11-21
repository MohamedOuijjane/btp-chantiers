package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/**
 * Stock modifié en même temps par une autre opération (verrou optimiste) : faute SOAP Conflit
 * (409 côté front, #145).
 */
@SoapFault(faultCode = FaultCode.CUSTOM, customFaultCode = FautesMateriaux.CONFLIT)
public class ConflitStockException extends RuntimeException {
    /** Crée l'exception avec le message renvoyé dans la faute SOAP et le conflit d'origine. */
    public ConflitStockException(String message, Throwable cause) {
        super(message, cause);
    }
}
