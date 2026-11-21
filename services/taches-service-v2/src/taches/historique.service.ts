import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HistoriqueStatut } from './historique.entity';
import { StatutTache } from './tache.entity';

/** Entrée de l'historique telle que renvoyée par l'API (date ISO, motif absent quand il est vide). */
export type EntreeHistorique = { tacheId: number; statut: StatutTache; date: string; motif?: string };

/** Historique des changements de statut d'une tâche (#99), table historique_statut. */
@Injectable()
export class HistoriqueService {
  constructor(@InjectRepository(HistoriqueStatut) private readonly lignes: Repository<HistoriqueStatut>) {}

  async enregistrer(tacheId: number, statut: StatutTache, motif?: string): Promise<void> {
    await this.lignes.save(this.lignes.create({ tacheId, statut, motif: motif ?? null }));
  }

  /** Du plus récent au plus ancien (l'identifiant départage deux changements simultanés). */
  async lister(tacheId: number): Promise<EntreeHistorique[]> {
    const entrees = await this.lignes.find({ where: { tacheId }, order: { date: 'DESC', id: 'DESC' } });
    return entrees.map((e) => ({
      tacheId: e.tacheId,
      statut: e.statut,
      date: e.date.toISOString(),
      ...(e.motif ? { motif: e.motif } : {}),
    }));
  }
    /** Motif du blocage en cours : la dernière entrée BLOQUEE de chaque tâche (null si le motif est vide). */
  async motifsDuBlocage(tacheIds: number[]): Promise<Map<number, string | null>> {
    const motifs = new Map<number, string | null>();
    if (!tacheIds.length) return motifs;
    const entrees = await this.lignes.find({
      where: { tacheId: In(tacheIds), statut: StatutTache.BLOQUEE },
      order: { date: 'DESC', id: 'DESC' },
    });
    for (const e of entrees) if (!motifs.has(e.tacheId)) motifs.set(e.tacheId, e.motif);
    return motifs;
  }
}