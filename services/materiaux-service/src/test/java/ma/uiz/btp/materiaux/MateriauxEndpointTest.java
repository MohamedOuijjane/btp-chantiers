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

    private void ajouterCiment(String ref, int stock, int seuil) {
      client.sendRequest(withPayload(new StringSource("""
          <m:AjouterMateriauRequest xmlns:m="%s"><m:materiau>
            <m:reference>%s</m:reference><m:nom>Ciment CPJ45</m:nom><m:unite>sac</m:unite>
            <m:stock>%d</m:stock><m:seuilAlerte>%d</m:seuilAlerte>
          </m:materiau></m:AjouterMateriauRequest>""".formatted(NS, ref, stock, seuil))))
          .andExpect(noFault())
          .andExpect(xpath("//m:materiau/m:reference", NAMESPACES).evaluatesTo(ref));
    }

    @Test
    void ajouterEtGetMateriau() {
        ajouterCiment("CIM-REF-01", 100, 20);

        // Tester la récupération par ID (GetMateriau)
        client.sendRequest(withPayload(new StringSource("""
                <m:GetMateriauRequest xmlns:m="%s">
                    <m:id>1</m:id>
                </m:GetMateriauRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("//m:GetMateriauResponse/m:materiau/m:reference", NAMESPACES).evaluatesTo("CIM-REF-01"))
              .andExpect(xpath("//m:GetMateriauResponse/m:materiau/m:enAlerte", NAMESPACES).evaluatesTo("false"));
    }

    @Test
    void verifierStockSucces() {
        ajouterCiment("CIM-REF-02", 200, 50);

        client.sendRequest(withPayload(new StringSource("""
                <m:VerifierStockRequest xmlns:m="%s">
                    <m:materiauId>1</m:materiauId>
                    <m:quantite>150.0</m:quantite>
                </m:VerifierStockRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("//m:VerifierStockResponse/m:disponible", NAMESPACES).evaluatesTo("true"))
              .andExpect(xpath("//m:VerifierStockResponse/m:stockActuel", NAMESPACES).evaluatesTo("200.0"));
    }

    @Test
    void verifierStockInsuffisant() {
        ajouterCiment("CIM-REF-03", 50, 10);

        client.sendRequest(withPayload(new StringSource("""
                <m:VerifierStockRequest xmlns:m="%s">
                    <m:materiauId>1</m:materiauId>
                    <m:quantite>100.0</m:quantite>
                </m:VerifierStockRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("//m:VerifierStockResponse/m:disponible", NAMESPACES).evaluatesTo("false"));
    }

    @Test
    void listerMateriauxAvecEtSansAlerte() {
        // Matériau en stock normal
        ajouterCiment("CIM-NORMAL", 100, 20);
        // Matériau en état d'alerte (stock <= seuil)
        ajouterCiment("CIM-ALERTE", 10, 25);

        // 1. Lister tous les matériaux (doit en retourner 2)
        client.sendRequest(withPayload(new StringSource("""
                <m:ListerMateriauxRequest xmlns:m="%s">
                    <m:enAlerteSeulement>false</m:enAlerteSeulement>
                </m:ListerMateriauxRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("count(//m:ListerMateriauxResponse/m:materiau)", NAMESPACES).evaluatesTo("2"));

        // 2. Lister uniquement les matériaux en alerte (doit en retourner 1)
        client.sendRequest(withPayload(new StringSource("""
                <m:ListerMateriauxRequest xmlns:m="%s">
                    <m:enAlerteSeulement>true</m:enAlerteSeulement>
                </m:ListerMateriauxRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("count(//m:ListerMateriauxResponse/m:materiau)", NAMESPACES).evaluatesTo("1"))
              .andExpect(xpath("//m:ListerMateriauxResponse/m:materiau/m:reference", NAMESPACES).evaluatesTo("CIM-ALERTE"));
    }

    @Test
    void enregistrerMouvementEntreeSucces() {
        ajouterCiment("CIM-ENTREE", 50, 10);

        client.sendRequest(withPayload(new StringSource("""
                <m:EnregistrerMouvementRequest xmlns:m="%s">
                    <m:materiauId>1</m:materiauId>
                    <m:chantierId>10</m:chantierId>
                    <m:type>ENTREE</m:type>
                    <m:quantite>30.0</m:quantite>
                </m:EnregistrerMouvementRequest>""".formatted(NS))))
              .andExpect(noFault())
              .andExpect(xpath("//m:EnregistrerMouvementResponse/m:stockApres", NAMESPACES).evaluatesTo("80.0"))
              .andExpect(xpath("//m:EnregistrerMouvementResponse/m:enAlerte", NAMESPACES).evaluatesTo("false"));
    }

    @Test
    void sortieSuperieureAuStockRenvoieUnSoapFault() {
        ajouterCiment("CIM-SORTIE", 50, 10);

        client.sendRequest(withPayload(new StringSource("""
                <m:EnregistrerMouvementRequest xmlns:m="%s">
                    <m:materiauId>1</m:materiauId>
                    <m:chantierId>10</m:chantierId>
                    <m:type>SORTIE</m:type>
                    <m:quantite>999.0</m:quantite>
                </m:EnregistrerMouvementRequest>""".formatted(NS))))
              .andExpect(clientOrSenderFault());
    }
}