package ma.uiz.btp.materiaux.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "materiaux")
public class MateriauEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long version;

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

    public boolean aStockSuffisant(double quantite) {
        verifierQuantite(quantite);
        return stock >= quantite;
    }

    /** Règle métier : une sortie ne peut pas rendre le stock négatif. */
    public void sortir(double quantite) {
        verifierQuantite(quantite);
        if (quantite > stock) {
            throw new StockInsuffisantException(reference, stock, quantite);
        }
        setStock(stock - quantite);
    }

    public void entrer(double quantite) {
        verifierQuantite(quantite);
        setStock(stock + quantite);
    }

    private static void verifierQuantite(double quantite) {
        if (!Double.isFinite(quantite) || quantite <= 0) {
            throw new ValeurStockInvalideException("La quantité doit être un nombre fini strictement positif");
        }
    }

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getUnite() { return unite; }
    public void setUnite(String unite) { this.unite = unite; }
    public double getStock() { return stock; }
    public void setStock(double stock) {
        if (!Double.isFinite(stock) || stock < 0) {
            throw new ValeurStockInvalideException("Le stock doit être un nombre fini positif ou nul");
        }
        this.stock = stock;
    }
    public double getSeuilAlerte() { return seuilAlerte; }
    public void setSeuilAlerte(double seuilAlerte) {
        if (!Double.isFinite(seuilAlerte) || seuilAlerte < 0) {
            throw new ValeurStockInvalideException("Le seuil d'alerte doit être un nombre fini positif ou nul");
        }
        this.seuilAlerte = seuilAlerte;
    }
}
