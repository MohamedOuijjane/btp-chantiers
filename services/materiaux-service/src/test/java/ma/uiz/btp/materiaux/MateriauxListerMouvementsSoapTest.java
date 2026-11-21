package ma.uiz.btp.materiaux;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.ws.test.server.RequestCreators.withPayload;
import static org.springframework.ws.test.server.ResponseMatchers.noFault;
import static org.springframework.ws.test.server.ResponseMatchers.validPayload;
import static org.springframework.ws.test.server.ResponseMatchers.xpath;

import java.io.IOException;
import java.io.StringWriter;
import java.util.Map;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.stream.StreamResult;
import ma.uiz.btp.materiaux.client.ChantiersClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.ws.test.server.MockWebServiceClient;
import org.springframework.ws.wsdl.wsdl11.DefaultWsdl11Definition;
import org.springframework.xml.transform.StringSource;

/** Opération SOAP ListerMouvements (#18) de bout en bout (MockWebServiceClient, base H2). */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MateriauxListerMouvementsSoapTest {

    private static final String NS = "http://btp.uiz.ma/materiaux";
    private static final Map<String, String> NAMESPACES = Map.of("m", NS);

    @Autowired ApplicationContext ctx;
    @MockBean ChantiersClient chantiersClient;
    private MockWebServiceClient client;

    @BeforeEach
    void init() {
        client = MockWebServiceClient.createClient(ctx);
        ajouter("CIM-01", "100");
        ajouter("FER-12", "50");
        mouvement(1, 7, "SORTIE", "10");
        mouvement(2, 8, "SORTIE", "5");
        mouvement(1, 8, "ENTREE", "20");
    }

    private void ajouter(String ref, String stock) {
        client.sendRequest(withPayload(new StringSource("""
                <m:AjouterMateriauRequest xmlns:m="%s"><m:materiau>
                  <m:reference>%s</m:reference><m:nom>Matériau %s</m:nom><m:unite>sac</m:unite>
                  <m:stock>%s</m:stock><m:seuilAlerte>1</m:seuilAlerte>
                </m:materiau></m:AjouterMateriauRequest>""".formatted(NS, ref, ref, stock))))
                .andExpect(noFault());
    }

    private void mouvement(int materiauId, int chantierId, String type, String quantite) {
        client.sendRequest(withPayload(new StringSource("""
                <m:EnregistrerMouvementRequest xmlns:m="%s">
                  <m:materiauId>%d</m:materiauId><m:chantierId>%d</m:chantierId>
                  <m:type>%s</m:type><m:quantite>%s</m:quantite>
                </m:EnregistrerMouvementRequest>""".formatted(NS, materiauId, chantierId, type, quantite))))
                .andExpect(noFault());
    }

    private static StringSource lister(String filtres) {
        return new StringSource("<m:ListerMouvementsRequest xmlns:m=\"%s\">%s</m:ListerMouvementsRequest>"
                .formatted(NS, filtres));
    }

    @Test
    @DisplayName("UT-MAT-57 : sans filtre, tous les mouvements, du plus récent au plus ancien")
    void sansFiltre() throws IOException {
        client.sendRequest(withPayload(lister("")))
                .andExpect(noFault())
                .andExpect(validPayload(new ClassPathResource("xsd/materiaux.xsd")))
                .andExpect(xpath("count(//m:mouvement)", NAMESPACES).evaluatesTo(3))
                .andExpect(xpath("//m:mouvement[1]/m:id", NAMESPACES).evaluatesTo(3))
                .andExpect(xpath("//m:mouvement[1]/m:type", NAMESPACES).evaluatesTo("ENTREE"))
                .andExpect(xpath("//m:mouvement[1]/m:quantite", NAMESPACES).evaluatesTo(20.0))
                .andExpect(xpath("//m:mouvement[3]/m:id", NAMESPACES).evaluatesTo(1))
                .andExpect(xpath("//m:mouvement[3]/m:materiauId", NAMESPACES).evaluatesTo(1))
                .andExpect(xpath("//m:mouvement[3]/m:chantierId", NAMESPACES).evaluatesTo(7))
                .andExpect(xpath("substring(//m:mouvement[1]/m:date, 11, 1)", NAMESPACES).evaluatesTo("T"));
    }

    @Test
    @DisplayName("UT-MAT-58 : filtre par chantier, par matériau, et les deux")
    void filtres() {
        client.sendRequest(withPayload(lister("<m:chantierId>8</m:chantierId>")))
                .andExpect(xpath("count(//m:mouvement)", NAMESPACES).evaluatesTo(2));
        client.sendRequest(withPayload(lister("<m:materiauId>1</m:materiauId>")))
                .andExpect(xpath("count(//m:mouvement)", NAMESPACES).evaluatesTo(2));
        client.sendRequest(withPayload(lister("<m:chantierId>8</m:chantierId><m:materiauId>2</m:materiauId>")))
                .andExpect(xpath("count(//m:mouvement)", NAMESPACES).evaluatesTo(1))
                .andExpect(xpath("//m:mouvement/m:id", NAMESPACES).evaluatesTo(2));
    }

    @Test
    @DisplayName("UT-MAT-59 : chantier sans mouvement : réponse vide, sans faute")
    void chantierSansMouvement() {
        client.sendRequest(withPayload(lister("<m:chantierId>99</m:chantierId>")))
                .andExpect(noFault())
                .andExpect(xpath("count(//m:mouvement)", NAMESPACES).evaluatesTo(0));
    }

    @Test
    @DisplayName("UT-MAT-60 : l'opération ListerMouvements est publiée dans le WSDL")
    void operationDansLeWsdl() throws Exception {
        DefaultWsdl11Definition wsdl = ctx.getBean("materiaux", DefaultWsdl11Definition.class);
        StringWriter texte = new StringWriter();
        TransformerFactory.newInstance().newTransformer()
                .transform(wsdl.getSource(), new StreamResult(texte));
        assertTrue(texte.toString().contains("ListerMouvements"), "opération absente du WSDL");
    }
}
