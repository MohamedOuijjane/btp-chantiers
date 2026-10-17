package ma.uiz.btp.materiaux.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MateriauRepository extends JpaRepository<MateriauEntity, Long> {
    @Query("select m from MateriauEntity m where m.stock <= m.seuilAlerte")
    List<MateriauEntity> findEnAlerte();
}
