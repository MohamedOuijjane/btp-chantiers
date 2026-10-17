package ma.uiz.btp.materiaux.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** Historique des entrées/sorties de stock, toujours rattachées à un chantier. */
@Entity
@Table(name = "mouvements")
public class Mouvement {

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

    protected Mouvement() {}

    public Mouvement(MateriauEntity materiau, Long chantierId, Type type, double quantite) {
        this.materiau = materiau;
        this.chantierId = chantierId;
        this.type = type;
        this.quantite = quantite;
    }

    public Long getId() { return id; }
    public MateriauEntity getMateriau() { return materiau; }
    public Long getChantierId() { return chantierId; }
    public Type getType() { return type; }
    public double getQuantite() { return quantite; }
    public Instant getDate() { return date; }
}
