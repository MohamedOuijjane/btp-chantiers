package ma.uiz.btp.chantiers.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Accès aux chantiers (Spring Data JPA). */
public interface ChantierRepository extends JpaRepository<Chantier, Long> {
    /** Renvoie les chantiers d'un statut donné. */
    List<Chantier> findByStatut(StatutChantier statut);
}
