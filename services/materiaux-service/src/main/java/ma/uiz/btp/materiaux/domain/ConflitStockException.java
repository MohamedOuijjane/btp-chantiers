package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

@SoapFault(faultCode = FaultCode.CLIENT)
public class ConflitStockException extends RuntimeException {
    public ConflitStockException(String message, Throwable cause) {
        super(message, cause);
    }
}
