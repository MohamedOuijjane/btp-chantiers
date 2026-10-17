package ma.uiz.btp.materiaux.ws;

import ma.uiz.btp.materiaux.config.WebServiceConfig;
import ma.uiz.btp.materiaux.domain.MateriauEntity;
import ma.uiz.btp.materiaux.domain.Mouvement;
import ma.uiz.btp.materiaux.ws.gen.*;
import org.springframework.ws.server.endpoint.annotation.Endpoint;
import org.springframework.ws.server.endpoint.annotation.PayloadRoot;
import org.springframework.ws.server.endpoint.annotation.RequestPayload;
import org.springframework.ws.server.endpoint.annotation.ResponsePayload;

/** Point d'entrée SOAP : une méthode par opération du contrat XSD. */
@Endpoint
public class MateriauxEndpoint {

    private static final String NS = WebServiceConfig.NAMESPACE;
    private final MateriauService service;

    public MateriauxEndpoint(MateriauService service) {
        this.service = service;
    }

    @PayloadRoot(namespace = NS, localPart = "AjouterMateriauRequest")
    @ResponsePayload
    public AjouterMateriauResponse ajouter(@RequestPayload AjouterMateriauRequest req) {
        Materiau in = req.getMateriau();
        MateriauEntity e = new MateriauEntity();
        e.setReference(in.getReference());
        e.setNom(in.getNom());
        e.setUnite(in.getUnite());
        e.setStock(in.getStock());
        e.setSeuilAlerte(in.getSeuilAlerte());
        AjouterMateriauResponse resp = new AjouterMateriauResponse();
        resp.setMateriau(versXml(service.ajouter(e)));
        return resp;
    }

    @PayloadRoot(namespace = NS, localPart = "GetMateriauRequest")
    @ResponsePayload
    public GetMateriauResponse trouver(@RequestPayload GetMateriauRequest req) {
        GetMateriauResponse resp = new GetMateriauResponse();
        resp.setMateriau(versXml(service.trouver(req.getId())));
        return resp;
    }

    @PayloadRoot(namespace = NS, localPart = "ListerMateriauxRequest")
    @ResponsePayload
    public ListerMateriauxResponse lister(@RequestPayload ListerMateriauxRequest req) {
        boolean alerte = Boolean.TRUE.equals(req.isEnAlerteSeulement());
        ListerMateriauxResponse resp = new ListerMateriauxResponse();
        service.lister(alerte).forEach(m -> resp.getMateriau().add(versXml(m)));
        return resp;
    }

    @PayloadRoot(namespace = NS, localPart = "VerifierStockRequest")
    @ResponsePayload
    public VerifierStockResponse verifierStock(@RequestPayload VerifierStockRequest req) {
        MateriauEntity m = service.trouver(req.getMateriauId());
        VerifierStockResponse resp = new VerifierStockResponse();
        resp.setDisponible(m.getStock() >= req.getQuantite());
        resp.setStockActuel(m.getStock());
        return resp;
    }

    @PayloadRoot(namespace = NS, localPart = "EnregistrerMouvementRequest")
    @ResponsePayload
    public EnregistrerMouvementResponse mouvement(@RequestPayload EnregistrerMouvementRequest req) {
        Mouvement mv = service.enregistrerMouvement(
                req.getMateriauId(), req.getChantierId(), Mouvement.Type.valueOf(req.getType().value()), req.getQuantite());
        EnregistrerMouvementResponse resp = new EnregistrerMouvementResponse();
        resp.setMouvementId(mv.getId());
        resp.setStockApres(mv.getMateriau().getStock());
        resp.setEnAlerte(mv.getMateriau().isEnAlerte());
        return resp;
    }

    private static Materiau versXml(MateriauEntity e) {
        Materiau m = new Materiau();
        m.setId(e.getId());
        m.setReference(e.getReference());
        m.setNom(e.getNom());
        m.setUnite(e.getUnite());
        m.setStock(e.getStock());
        m.setSeuilAlerte(e.getSeuilAlerte());
        m.setEnAlerte(e.isEnAlerte());
        return m;
    }
}
