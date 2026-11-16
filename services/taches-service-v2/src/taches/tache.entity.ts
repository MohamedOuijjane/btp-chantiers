import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StatutTache {
  A_FAIRE = 'A_FAIRE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  BLOQUEE = 'BLOQUEE',
}

/** Une tâche d'un chantier (schéma taches de btp_db, table tache). */
@Entity({ name: 'tache' })
export class Tache {
  @PrimaryGeneratedColumn()
  id: number;

  /** Référence vers le module Chantiers (identifiant, pas de clé étrangère entre schémas). */
  @Column({ name: 'chantier_id', type: 'integer' })
  chantierId: number;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Date ISO aaaa-mm-jj (type date de PostgreSQL, sans heure ni fuseau). */
  @Column({ name: 'date_debut', type: 'date' })
  dateDebut: string;

  @Column({ name: 'date_fin', type: 'date' })
  dateFin: string;

  @Column({ type: 'varchar', length: 10, default: StatutTache.A_FAIRE })
  statut: StatutTache;

  @Column({ type: 'smallint', default: 0 })
  avancement: number;

  /** Références vers le module Ouvriers. */
  @Column({ name: 'ouvrier_ids', type: 'integer', array: true, default: () => "'{}'" })
  ouvrierIds: number[];

  @OneToMany(() => BesoinMateriau, (b) => b.tache, { cascade: true, eager: true })
  besoinsMateriaux: BesoinMateriau[];

  @CreateDateColumn({ name: 'cree_le', type: 'timestamptz' })
  creeLe: Date;

  @UpdateDateColumn({ name: 'modifie_le', type: 'timestamptz' })
  modifieLe: Date;
}

/**
 * Besoin d'une tâche en matériau (classe d'association Tâche–Matériau du diagramme de classes).
 * Le matériau est une référence vers le module Matériaux.
 */
@Entity({ name: 'besoin_materiau' })
export class BesoinMateriau {
  @PrimaryColumn({ name: 'tache_id', type: 'integer' })
  tacheId: number;

  @PrimaryColumn({ name: 'materiau_id', type: 'integer' })
  materiauId: number;

  /** numeric(12,3) : renvoyé en chaîne par le pilote pg, converti en nombre. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string | null) => (v === null ? null : Number(v)) },
  })
  quantite: number;

  @ManyToOne(() => Tache, (t) => t.besoinsMateriaux, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tache_id' })
  tache: Tache;
}
