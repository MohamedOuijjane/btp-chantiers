package ma.uiz.btp.materiaux.ws;

import java.util.List;
import ma.uiz.btp.materiaux.client.ChantiersClient;
import ma.uiz.btp.materiaux.domain.IntrouvableException;
import ma.uiz.btp.materiaux.domain.MateriauEntity;
import ma.uiz.btp.materiaux.domain.MateriauRepository;
import ma.uiz.btp.materiaux.domain.Mouvement;
import ma.uiz.btp.materiaux.domain.MouvementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Règles de gestion du stock : consultation, ajout et mouvements vers un chantier actif. */
@Service
@Transactional
public class MateriauService {

    private final MateriauRepository materiaux;
    private final MouvementRepository mouvements;
    private final ChantiersClient chantiers;

    /** Crée le service avec les dépôts et le client du module Chantiers. */
    public MateriauService(MateriauRepository materiaux, MouvementRepository mouvements,
                           ChantiersClient chantiers) {
        this.materiaux = materiaux;
        this.mouvements = mouvements;
        this.chantiers = chantiers;
    }

    /** Enregistre un nouveau matériau. */
    public MateriauEntity ajouter(MateriauEntity m) {
        return materiaux.save(m);
    }

    /** Renvoie le matériau, ou lève IntrouvableException. */
    @Transactional(readOnly = true)
    public MateriauEntity trouver(long id) {
        return materiaux.findById(id)
                .orElseThrow(() -> new IntrouvableException("Matériau " + id + " introuvable"));
    }

    /** Liste tous les matériaux, ou seulement ceux en alerte. */
    @Transactional(readOnly = true)
    public List<MateriauEntity> lister(boolean enAlerteSeulement) {
        return enAlerteSeulement ? materiaux.findEnAlerte() : materiaux.findAll();
    }

    /** Indique si le stock du matériau couvre la quantité demandée. */
    @Transactional(readOnly = true)
    public boolean stockSuffisant(long materiauId, double quantite) {
        return trouver(materiauId).stockSuffitPour(quantite);
    }

    /**
     * Enregistre une entrée ou une sortie de stock pour un chantier.
     *
     * <p>Le chantier est vérifié auprès du module Chantiers avant toute modification du stock.
     */
    public Mouvement enregistrerMouvement(long materiauId, long chantierId, Mouvement.Type type,
                                          double quantite) {
        chantiers.verifierChantierActif(chantierId);
        MateriauEntity m = trouver(materiauId);
        if (type == Mouvement.Type.SORTIE) {
            m.sortir(quantite);
        } else {
            m.entrer(quantite);
        }
        return mouvements.save(new Mouvement(m, chantierId, type, quantite));
    }
}
