package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Transformée automatiquement en SOAP Fault (côté client). */
@SoapFault(faultCode = FaultCode.CLIENT)
public class StockInsuffisantException extends RuntimeException {
    public StockInsuffisantException(String reference, double stock, double demande) {
        super("Stock insuffisant pour " + reference + " : disponible " + stock + ", demandé " + demande);
    }
}
