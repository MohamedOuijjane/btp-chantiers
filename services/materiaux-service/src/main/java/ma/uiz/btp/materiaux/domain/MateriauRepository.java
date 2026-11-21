package ma.uiz.btp.materiaux.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Accès aux matériaux (Spring Data JPA). */
public interface MateriauRepository extends JpaRepository<MateriauEntity, Long> {
    /** Renvoie les matériaux en alerte : stock inférieur ou égal au seuil. */
    @Query("select m from MateriauEntity m where m.stock <= m.seuilAlerte")
    List<MateriauEntity> findEnAlerte();

    /** Indique si un matériau porte déjà cette référence (unique). */
    boolean existsByReference(String reference);
}
