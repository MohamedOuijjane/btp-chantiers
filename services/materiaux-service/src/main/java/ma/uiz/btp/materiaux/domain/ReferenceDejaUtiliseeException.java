package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Référence de matériau déjà utilisée (#132) : faute SOAP Conflit (409 côté front, #145). */
@SoapFault(faultCode = FaultCode.CUSTOM, customFaultCode = FautesMateriaux.CONFLIT)
public class ReferenceDejaUtiliseeException extends RuntimeException {

    /** Crée l'exception avec la référence en double, citée dans le message. */
    public ReferenceDejaUtiliseeException(String reference) {
        super("La référence " + reference + " est déjà utilisée par un autre matériau");
    }
}
