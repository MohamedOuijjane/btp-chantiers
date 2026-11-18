package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

@SoapFault(faultCode = FaultCode.CLIENT)
public class ValeurStockInvalideException extends RuntimeException {
    public ValeurStockInvalideException(String message) {
        super(message);
    }
}
