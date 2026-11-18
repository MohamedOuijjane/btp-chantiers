package ma.uiz.btp.materiaux.domain;

import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

@SoapFault(faultCode = FaultCode.SERVER)
public class ChantiersIndisponibleException extends RuntimeException {
    public ChantiersIndisponibleException(String message) {
        super(message);
    }

    public ChantiersIndisponibleException(String message, Throwable cause) {
        super(message, cause);
    }
}
