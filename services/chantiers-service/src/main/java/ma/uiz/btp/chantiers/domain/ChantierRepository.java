package ma.uiz.btp.chantiers.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChantierRepository extends JpaRepository<Chantier, Long> {
    List<Chantier> findByStatut(StatutChantier statut);
}
