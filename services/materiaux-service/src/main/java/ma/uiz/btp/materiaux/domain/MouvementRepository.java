package ma.uiz.btp.materiaux.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Accès aux mouvements de stock (Spring Data JPA). Les listes sont triées du plus récent au plus
 * ancien ; l'identifiant départage deux mouvements de même date. Requêtes écrites en JPQL : le
 * matériau est une association (m.materiau.id), pas un attribut materiauId.
 */
public interface MouvementRepository extends JpaRepository<Mouvement, Long> {

    /** Tous les mouvements, du plus récent au plus ancien. */
    @Query("select m from Mouvement m order by m.date desc, m.id desc")
    List<Mouvement> tous();

    /** Mouvements d'un chantier, du plus récent au plus ancien. */
    @Query("select m from Mouvement m where m.chantierId = :chantierId "
            + "order by m.date desc, m.id desc")
    List<Mouvement> parChantier(@Param("chantierId") Long chantierId);

    /** Mouvements d'un matériau, du plus récent au plus ancien. */
    @Query("select m from Mouvement m where m.materiau.id = :materiauId "
            + "order by m.date desc, m.id desc")
    List<Mouvement> parMateriau(@Param("materiauId") Long materiauId);

    /** Mouvements d'un matériau vers un chantier, du plus récent au plus ancien. */
    @Query("select m from Mouvement m where m.chantierId = :chantierId "
            + "and m.materiau.id = :materiauId order by m.date desc, m.id desc")
    List<Mouvement> parChantierEtMateriau(@Param("chantierId") Long chantierId,
                                          @Param("materiauId") Long materiauId);
}
