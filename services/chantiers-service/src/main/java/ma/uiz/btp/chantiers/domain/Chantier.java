package ma.uiz.btp.chantiers.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "chantiers")
public class Chantier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false)
    private String adresse;

    @Column(nullable = false, length = 150)
    private String client;

    @Column(nullable = false)
    private LocalDate dateDebut;

    @Column(nullable = false)
    private LocalDate dateFinPrevue;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal budget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatutChantier statut = StatutChantier.PLANIFIE;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** Règle métier : un chantier terminé ne peut plus être modifié. */
    public void verifierModifiable() {
        if (statut == StatutChantier.TERMINE) {
            throw new RegleMetierException("Le chantier " + id + " est terminé et ne peut plus être modifié.");
        }
    }

    public void cloturer() {
        verifierModifiable();
        this.statut = StatutChantier.TERMINE;
    }

    public Long getId() { return id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }
    public String getClient() { return client; }
    public void setClient(String client) { this.client = client; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateFinPrevue() { return dateFinPrevue; }
    public void setDateFinPrevue(LocalDate dateFinPrevue) { this.dateFinPrevue = dateFinPrevue; }
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public StatutChantier getStatut() { return statut; }
    public void setStatut(StatutChantier statut) { this.statut = statut; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
