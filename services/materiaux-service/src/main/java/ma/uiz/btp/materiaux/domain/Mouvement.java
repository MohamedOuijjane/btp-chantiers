package ma.uiz.btp.materiaux.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** Historique des entrées/sorties de stock, toujours rattachées à un chantier. */
@Entity
@Table(name = "mouvements")
public class Mouvement {

    /** Sens du mouvement : entrée ou sortie de stock. */
    public enum Type { ENTREE, SORTIE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private MateriauEntity materiau;

    @Column(nullable = false)
    private Long chantierId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Type type;

    @Column(nullable = false)
    private double quantite;

    @Column(name = "date_mouvement", nullable = false)
    private Instant date = Instant.now();

    /** Constructeur réservé à JPA. */
    protected Mouvement() {}

    /** Crée le mouvement d'un matériau vers un chantier. */
    public Mouvement(MateriauEntity materiau, Long chantierId, Type type, double quantite) {
        this.materiau = materiau;
        this.chantierId = chantierId;
        this.type = type;
        this.quantite = quantite;
    }

    public Long getId() {
        return id;
    }

    /** Stock du matériau après ce mouvement (une valeur, pas l'entité : SpotBugs EI_EXPOSE_REP). */
    public double getStockApresMouvement() {
        return materiau.getStock();
    }

    /** Indique si le matériau est en alerte (stock au seuil ou en dessous) après ce mouvement. */
    public boolean isMateriauEnAlerte() {
        return materiau.isEnAlerte();
    }

    public Long getChantierId() {
        return chantierId;
    }

    public Type getType() {
        return type;
    }

    public double getQuantite() {
        return quantite;
    }

    public Instant getDate() {
        return date;
    }
}
