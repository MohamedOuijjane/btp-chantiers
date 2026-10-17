package ma.uiz.btp.materiaux.ws;

import ma.uiz.btp.materiaux.client.ChantiersClient;
import ma.uiz.btp.materiaux.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MateriauService {

    private final MateriauRepository materiaux;
    private final MouvementRepository mouvements;
    private final ChantiersClient chantiers;

    public MateriauService(MateriauRepository materiaux, MouvementRepository mouvements, ChantiersClient chantiers) {
        this.materiaux = materiaux;
        this.mouvements = mouvements;
        this.chantiers = chantiers;
    }

    public MateriauEntity ajouter(MateriauEntity m) {
        return materiaux.save(m);
    }

    @Transactional(readOnly = true)
    public MateriauEntity trouver(long id) {
        return materiaux.findById(id).orElseThrow(() -> new IntrouvableException("Matériau " + id + " introuvable"));
    }

    @Transactional(readOnly = true)
    public List<MateriauEntity> lister(boolean enAlerteSeulement) {
        return enAlerteSeulement ? materiaux.findEnAlerte() : materiaux.findAll();
    }

    @Transactional(readOnly = true)
    public boolean stockSuffisant(long materiauId, double quantite) {
        return trouver(materiauId).getStock() >= quantite;
    }

    public Mouvement enregistrerMouvement(long materiauId, long chantierId, Mouvement.Type type, double quantite) {
        chantiers.verifierChantierActif(chantierId);
        MateriauEntity m = trouver(materiauId);
        if (type == Mouvement.Type.SORTIE) m.sortir(quantite); else m.entrer(quantite);
        return mouvements.save(new Mouvement(m, chantierId, type, quantite));
    }
}
