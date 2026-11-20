package ma.uiz.btp.materiaux.ws;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ma.uiz.btp.materiaux.domain.ConflitStockException;
import ma.uiz.btp.materiaux.domain.MateriauEntity;
import ma.uiz.btp.materiaux.domain.Mouvement;
import ma.uiz.btp.materiaux.ws.gen.EnregistrerMouvementRequest;
import ma.uiz.btp.materiaux.ws.gen.EnregistrerMouvementResponse;
import ma.uiz.btp.materiaux.ws.gen.TypeMouvement;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.ws.soap.server.endpoint.annotation.FaultCode;
import org.springframework.ws.soap.server.endpoint.annotation.SoapFault;

/** Endpoint EnregistrerMouvement sans Spring : réponse construite et accès concurrent au stock. */
class MateriauxEndpointConflitTest {

    private final MateriauService service = mock(MateriauService.class);
    private final MateriauxEndpoint endpoint = new MateriauxEndpoint(service);

    private static EnregistrerMouvementRequest sortie(double quantite) {
        EnregistrerMouvementRequest req = new EnregistrerMouvementRequest();
        req.setMateriauId(1L);
        req.setChantierId(7L);
        req.setType(TypeMouvement.SORTIE);
        req.setQuantite(quantite);
        return req;
    }

    @Test
    @DisplayName("UT-MAT-30 : la réponse porte le stock après mouvement et l'alerte (sans exposer l'entité)")
    void reponseStockEtAlerte() {
        MateriauEntity m = new MateriauEntity();
        m.setReference("FER-12");
        m.setStock(25);
        m.setSeuilAlerte(30);
        Mouvement mv = new Mouvement(m, 7L, Mouvement.Type.SORTIE, 5);
        ReflectionTestUtils.setField(mv, "id", 42L);
        when(service.enregistrerMouvement(1L, 7L, Mouvement.Type.SORTIE, 5)).thenReturn(mv);

        EnregistrerMouvementResponse resp = endpoint.mouvement(sortie(5));

        assertEquals(42L, resp.getMouvementId());
        assertEquals(25, resp.getStockApres());
        assertTrue(resp.isEnAlerte());
    }

    @Test
    @DisplayName("UT-MAT-31 : un conflit de verrou optimiste devient une faute Client explicite")
    void conflitDeVerrouDevientFauteClient() {
        ObjectOptimisticLockingFailureException verrou =
                new ObjectOptimisticLockingFailureException(MateriauEntity.class, 1L);
        when(service.enregistrerMouvement(anyLong(), anyLong(), eq(Mouvement.Type.SORTIE), anyDouble()))
                .thenThrow(verrou);

        ConflitStockException e = assertThrows(ConflitStockException.class, () -> endpoint.mouvement(sortie(5)));

        assertEquals("Le stock a été modifié par une autre opération; relisez-le avant de réessayer.",
                e.getMessage());
        assertInstanceOf(ObjectOptimisticLockingFailureException.class, e.getCause());
        SoapFault faute = ConflitStockException.class.getAnnotation(SoapFault.class);
        assertEquals(FaultCode.CLIENT, faute.faultCode());
        assertFalse(e.getMessage().contains("Optimistic"), "pas de détail technique dans la faute");
    }
}
