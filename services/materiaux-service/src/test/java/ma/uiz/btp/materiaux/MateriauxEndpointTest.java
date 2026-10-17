package ma.uiz.btp.materiaux;

import ma.uiz.btp.materiaux.client.ChantiersClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.ws.test.server.MockWebServiceClient;
import org.springframework.xml.transform.StringSource;

import java.util.Map;

import static org.springframework.ws.test.server.RequestCreators.withPayload;
import static org.springframework.ws.test.server.ResponseMatchers.*;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MateriauxEndpointTest {

    private static final String NS = "http://btp.uiz.ma/materiaux";
    private static final Map<String, String> NAMESPACES = Map.of("m", NS);

    @Autowired ApplicationContext ctx;
    @MockBean ChantiersClient chantiersClient;
    private MockWebServiceClient client;

    @BeforeEach
    void init() {
        client = MockWebServiceClient.createClient(ctx);
    }

    private void ajouterCiment(String ref) {
        client.sendRequest(withPayload(new StringSource("""
                <m:AjouterMateriauRequest xmlns:m="%s"><m:materiau>
                  <m:reference>%s</m:reference><m:nom>Ciment CPJ45</m:nom><m:unite>sac</m:unite>
                  <m:stock>100</m:stock><m:seuilAlerte>20</m:seuilAlerte>
                </m:materiau></m:AjouterMateriauRequest>""".formatted(NS, ref))))
              .andExpect(noFault())
              .andExpect(xpath("//m:materiau/m:enAlerte", NAMESPACES).evaluatesTo(false));
    }

    @Test
    void verifierStock() {
        ajouterCiment("CIM-01");
        client.sendRequest(withPayload(new StringSource("""
                <m:VerifierStockRequest xmlns:m="%s"><m:materiauId>1</m:materiauId><m:quantite>150</m:quantite></m:VerifierStockRequest>
                """.formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("//m:disponible", NAMESPACES).evaluatesTo(false));
    }

    @Test
    void sortieSuperieureAuStockRenvoieUnSoapFault() {
        ajouterCiment("CIM-02");
        client.sendRequest(withPayload(new StringSource("""
                <m:EnregistrerMouvementRequest xmlns:m="%s">
                  <m:materiauId>1</m:materiauId><m:chantierId>1</m:chantierId><m:type>SORTIE</m:type><m:quantite>9999</m:quantite>
                </m:EnregistrerMouvementRequest>""".formatted(NS))))
              .andExpect(clientOrSenderFault());
    }
}
