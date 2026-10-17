package ma.uiz.btp.chantiers.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChantierRepository extends JpaRepository<Chantier, Long> {
    List<Chantier> findByStatut(StatutChantier statut);
}
