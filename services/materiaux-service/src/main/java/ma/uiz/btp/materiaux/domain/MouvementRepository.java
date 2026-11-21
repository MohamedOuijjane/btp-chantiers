package ma.uiz.btp.materiaux.domain;

import org.springframework.data.jpa.repository.JpaRepository;

/** Accès aux mouvements de stock (Spring Data JPA). */
public interface MouvementRepository extends JpaRepository<Mouvement, Long> {
}
