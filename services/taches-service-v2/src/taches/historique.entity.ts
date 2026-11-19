import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StatutTache, Tache } from './tache.entity';

/** Une ligne par changement de statut d'une tâche (#99), table historique_statut. */
@Entity({ name: 'historique_statut' })
export class HistoriqueStatut {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tache_id', type: 'integer' })
  tacheId: number;

  @Column({ type: 'varchar', length: 10 })
  statut: StatutTache;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  motif: string | null;

  @ManyToOne(() => Tache, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tache_id' })
  tache: Tache;
}