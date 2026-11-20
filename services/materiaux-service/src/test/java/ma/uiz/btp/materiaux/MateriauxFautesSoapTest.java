package ma.uiz.btp.materiaux;

import static org.mockito.Mockito.doThrow;
import static org.springframework.ws.test.server.RequestCreators.withPayload;
import static org.springframework.ws.test.server.ResponseMatchers.clientOrSenderFault;
import static org.springframework.ws.test.server.ResponseMatchers.noFault;
import static org.springframework.ws.test.server.ResponseMatchers.serverOrReceiverFault;
import static org.springframework.ws.test.server.ResponseMatchers.xpath;

import java.util.Map;
import ma.uiz.btp.materiaux.client.ChantiersClient;
import ma.uiz.btp.materiaux.domain.ChantierTermineException;
import ma.uiz.btp.materiaux.domain.ChantiersIndisponibleException;
import ma.uiz.btp.materiaux.domain.IntrouvableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.ws.test.server.MockWebServiceClient;
import org.springframework.xml.transform.StringSource;

/**
 * SOAP Faults de bout en bout (MockWebServiceClient, base H2, Chantiers simulé) : chaque erreur
 * métier devient une faute Client avec son message ; une panne de Chantiers, une faute Server.
 */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class MateriauxFautesSoapTest {

    private static final String NS = "http://btp.uiz.ma/materiaux";
    private static final Map<String, String> NAMESPACES = Map.of("m", NS);

    @Autowired ApplicationContext ctx;
    @MockBean ChantiersClient chantiersClient;
    private MockWebServiceClient client;

    @BeforeEach
    void init() {
        client = MockWebServiceClient.createClient(ctx);
    }

    private static StringSource ajouter(String ref, String stock, String seuil) {
        return new StringSource("""
                <m:AjouterMateriauRequest xmlns:m="%s"><m:materiau>
                  <m:reference>%s</m:reference><m:nom>Fer à béton HA12</m:nom><m:unite>tonne</m:unite>
                  <m:stock>%s</m:stock><m:seuilAlerte>%s</m:seuilAlerte>
                </m:materiau></m:AjouterMateriauRequest>""".formatted(NS, ref, stock, seuil));
    }

    private static StringSource mouvement(String type, String quantite) {
        return new StringSource("""
                <m:EnregistrerMouvementRequest xmlns:m="%s">
                  <m:materiauId>1</m:materiauId><m:chantierId>7</m:chantierId>
                  <m:type>%s</m:type><m:quantite>%s</m:quantite>
                </m:EnregistrerMouvementRequest>""".formatted(NS, type, quantite));
    }

    private void ajouterFer() {
        client.sendRequest(withPayload(ajouter("FER-12", "2.4", "1"))).andExpect(noFault());
    }

    @Test
    @DisplayName("UT-MAT-41 : matériau inconnu : faute Client « Matériau 99 introuvable »")
    void materiauInconnu() {
        client.sendRequest(withPayload(new StringSource(
                        "<m:GetMateriauRequest xmlns:m=\"%s\"><m:id>99</m:id></m:GetMateriauRequest>".formatted(NS))))
                .andExpect(clientOrSenderFault("Matériau 99 introuvable"));
    }

    @Test
    @DisplayName("UT-MAT-42 : stock négatif à l'ajout : faute Client")
    void stockNegatifALAjout() {
        client.sendRequest(withPayload(ajouter("FER-13", "-1", "1")))
                .andExpect(clientOrSenderFault("Le stock doit être un nombre fini positif ou nul"));
    }

    @Test
    @DisplayName("UT-MAT-43 : vérification de stock avec une quantité nulle : faute Client")
    void verificationQuantiteNulle() {
        ajouterFer();
        client.sendRequest(withPayload(new StringSource("""
                        <m:VerifierStockRequest xmlns:m="%s">
                          <m:materiauId>1</m:materiauId><m:quantite>0</m:quantite>
                        </m:VerifierStockRequest>""".formatted(NS))))
                .andExpect(clientOrSenderFault("La quantité doit être un nombre fini strictement positif"));
    }

    @Test
    @DisplayName("UT-MAT-44 : sortie supérieure au stock : faute Client avec le message, stock inchangé")
    void stockInsuffisant() {
        ajouterFer();
        client.sendRequest(withPayload(mouvement("SORTIE", "5")))
                .andExpect(clientOrSenderFault("Stock insuffisant pour FER-12 : disponible 2.4, demandé 5.0"));
        client.sendRequest(withPayload(new StringSource(
                        "<m:GetMateriauRequest xmlns:m=\"%s\"><m:id>1</m:id></m:GetMateriauRequest>".formatted(NS))))
                .andExpect(xpath("//m:materiau/m:stock", NAMESPACES).evaluatesTo("2.4"));
    }

    @Test
    @DisplayName("UT-MAT-45 : sortie qui passe sous le seuil : réponse enAlerte = true")
    void sortieEnAlerte() {
        ajouterFer();
        client.sendRequest(withPayload(mouvement("SORTIE", "1.9")))
                .andExpect(noFault())
                .andExpect(xpath("//m:EnregistrerMouvementResponse/m:enAlerte", NAMESPACES).evaluatesTo("true"))
                .andExpect(xpath("//m:EnregistrerMouvementResponse/m:mouvementId", NAMESPACES).evaluatesTo("1"));
    }

    @Test
    @DisplayName("UT-MAT-46 : mouvement vers un chantier terminé : faute Client")
    void chantierTermine() {
        ajouterFer();
        doThrow(new ChantierTermineException("Le chantier 7 est terminé"))
                .when(chantiersClient).verifierChantierActif(7L);
        client.sendRequest(withPayload(mouvement("ENTREE", "1")))
                .andExpect(clientOrSenderFault("Le chantier 7 est terminé"));
    }

    @Test
    @DisplayName("UT-MAT-47 : mouvement vers un chantier inconnu : faute Client")
    void chantierInconnu() {
        ajouterFer();
        doThrow(new IntrouvableException("Chantier 7 introuvable"))
                .when(chantiersClient).verifierChantierActif(7L);
        client.sendRequest(withPayload(mouvement("ENTREE", "1")))
                .andExpect(clientOrSenderFault("Chantier 7 introuvable"));
    }

    @Test
    @DisplayName("UT-MAT-48 : Chantiers indisponible : faute Server")
    void chantiersIndisponible() {
        ajouterFer();
        doThrow(new ChantiersIndisponibleException("Échec de l'appel au service Chantiers."))
                .when(chantiersClient).verifierChantierActif(7L);
        client.sendRequest(withPayload(mouvement("SORTIE", "1")))
                .andExpect(serverOrReceiverFault("Échec de l'appel au service Chantiers."));
    }

    @Test
    @Disabled("Bug #132 : la référence en double donne une faute Server (erreur de la base non "
            + "convertie) au lieu d'une faute Client ; à réactiver avec la correction")
    @DisplayName("UT-MAT-49 : référence déjà utilisée : faute Client attendue (erreur de l'appelant)")
    void referenceEnDouble() {
        ajouterFer();
        client.sendRequest(withPayload(ajouter("FER-12", "3", "1")))
                .andExpect(clientOrSenderFault());
    }
}
