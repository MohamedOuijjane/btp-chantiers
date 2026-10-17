package ma.uiz.btp.materiaux.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "materiaux")
public class MateriauEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String reference;

    @Column(nullable = false)
    private String nom;

    /** Unité de mesure : sac, m3, tonne, unité... */
    @Column(nullable = false, length = 20)
    private String unite;

    @Column(nullable = false)
    private double stock;

    @Column(nullable = false)
    private double seuilAlerte;

    public boolean isEnAlerte() {
        return stock <= seuilAlerte;
    }

    /** Règle métier : une sortie ne peut pas rendre le stock négatif. */
    public void sortir(double quantite) {
        if (quantite <= 0) throw new IllegalArgumentException("La quantité doit être positive");
        if (quantite > stock) {
            throw new StockInsuffisantException(reference, stock, quantite);
        }
        stock -= quantite;
    }

    public void entrer(double quantite) {
        if (quantite <= 0) throw new IllegalArgumentException("La quantité doit être positive");
        stock += quantite;
    }

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getUnite() { return unite; }
    public void setUnite(String unite) { this.unite = unite; }
    public double getStock() { return stock; }
    public void setStock(double stock) { this.stock = stock; }
    public double getSeuilAlerte() { return seuilAlerte; }
    public void setSeuilAlerte(double seuilAlerte) { this.seuilAlerte = seuilAlerte; }
}
