import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChantiersClient } from "../clients/chantiers.client";
import { MateriauxSoapClient } from "../clients/materiaux.soap-client";
import { OuvriersClient } from "../clients/ouvriers.client";
import { AffectationDto, CreerTacheDto, BlocageDto} from "./tache.dto";
import { StatutTache, Tache, BesoinMateriau } from "./tache.entity";
import { EntreeHistorique, HistoriqueService } from "./historique.service";
import { verifierTransition } from "./transitions";

/** Tâche telle que renvoyée par l'API (identifiant entier, dates aaaa-mm-jj). */
export type TacheReponse = {
  id: number;
  chantierId: number;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutTache;
  avancement: number;
  ouvrierIds: number[];
  besoinsMateriaux: { materiauId: number; quantite: number }[];
};

export function versReponse(t: Tache): TacheReponse {
  return {
    id: t.id,
    chantierId: t.chantierId,
    titre: t.titre,
    ...(t.description ? { description: t.description } : {}),
    dateDebut: t.dateDebut,
    dateFin: t.dateFin,
    statut: t.statut,
    avancement: t.avancement,
    ouvrierIds: t.ouvrierIds ?? [],
    besoinsMateriaux: (t.besoinsMateriaux ?? [])
      .map((b) => ({ materiauId: b.materiauId, quantite: b.quantite }))
      .sort((a, b) => a.materiauId - b.materiauId),
  };
}

/** RG5 : le statut découle de l'avancement (0 → A_FAIRE, 1-99 → EN_COURS, 100 → TERMINEE). */
export function statutPourAvancement(avancement: number): StatutTache {
  if (avancement === 100) return StatutTache.TERMINEE;
  return avancement > 0 ? StatutTache.EN_COURS : StatutTache.A_FAIRE;
}

@Injectable()
export class TachesService {
  constructor(
    @InjectRepository(Tache) private readonly taches: Repository<Tache>,
    private readonly chantiers: ChantiersClient,
    private readonly ouvriers: OuvriersClient,
    private readonly materiaux: MateriauxSoapClient,
    private readonly journal: HistoriqueService,
  ) {}

  async lister(filtre: {
    chantierId?: number;
    ouvrierId?: number;
  }): Promise<TacheReponse[]> {
    const q = this.taches
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.besoinsMateriaux", "b")
      .orderBy("t.dateDebut", "ASC")
      .addOrderBy("t.id", "ASC");
    if (filtre.chantierId)
      q.andWhere("t.chantierId = :chantierId", {
        chantierId: filtre.chantierId,
      });
    if (filtre.ouvrierId)
      q.andWhere(":ouvrierId = ANY(t.ouvrier_ids)", {
        ouvrierId: filtre.ouvrierId,
      });
    return (await q.getMany()).map(versReponse);
  }

  async trouver(id: number): Promise<TacheReponse> {
    return versReponse(await this.charger(id));
  }

  /** Création : orchestre 3 modules (Chantiers REST, Ouvriers REST, Matériaux SOAP). */
  async creer(dto: CreerTacheDto): Promise<TacheReponse> {
    const { besoins, dateDebut, dateFin } = this.verifierCorps(dto);
    await this.chantiers.verifierChantierActif(dto.chantierId);
    if (dto.ouvrierIds?.length) {
      await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
      await this.verifierPlanning(dto.ouvrierIds, dateDebut, dateFin);
    }
    for (const b of besoins)
      await this.materiaux.verifierStock(b.materiauId, b.quantite);

    const cree = await this.taches.save(
      this.taches.create({
        chantierId: dto.chantierId,
        titre: dto.titre,
        description: dto.description ?? null,
        dateDebut,
        dateFin,
        statut: StatutTache.A_FAIRE,
        avancement: 0,
        ouvrierIds: dto.ouvrierIds ?? [],
        besoinsMateriaux: besoins.map((b) => ({
          materiauId: b.materiauId,
          quantite: b.quantite,
        })),
      }),
    );
    await this.journal.enregistrer(cree.id, StatutTache.A_FAIRE);
    return this.trouver(cree.id);
  }

  /** Une tâche bloquée garde son statut (RG5 ne s'applique qu'au déblocage, #11). */
  async mettreAJourAvancement(
    id: number,
    avancement: number,
  ): Promise<TacheReponse> {
    const tache = await this.charger(id);
    const ancienStatut = tache.statut;
    tache.avancement = avancement;
    if (tache.statut !== StatutTache.BLOQUEE)
      tache.statut = statutPourAvancement(avancement);
    const sauvee = await this.taches.save(tache);
    // RG5 : un changement de statut dû à l'avancement est tracé dans l'historique.
    if (sauvee.statut !== ancienStatut)
      await this.journal.enregistrer(id, sauvee.statut);
    return versReponse(sauvee);
  }

  /** Historique des statuts, du plus récent au plus ancien (404 si la tâche n'existe pas). */
  async historique(id: number): Promise<EntreeHistorique[]> {
    await this.charger(id);
    return this.journal.lister(id);
  }
  /** PATCH /statut (#99) : A_FAIRE → EN_COURS → TERMINEE ; TERMINEE force l'avancement à 100 (RG5). */
  async changerStatut(id: number, cible: StatutTache): Promise<TacheReponse> {
    const tache = await this.charger(id);
    verifierTransition(tache.statut, cible);
    await this.chantiers.verifierChantierModifiable(tache.chantierId);
    tache.statut = cible;
    if (cible === StatutTache.TERMINEE) tache.avancement = 100;
    const sauvee = await this.taches.save(tache);
    await this.journal.enregistrer(id, cible);
    return versReponse(sauvee);
  }
  /** Blocage / déblocage (#11). Au déblocage, le statut suit l'avancement (RG-05). */
  async changerBlocage(id: number, dto: BlocageDto): Promise<TacheReponse> {
    const tache = await this.charger(id);
    if (dto.bloquee) {
      if (tache.statut === StatutTache.TERMINEE)
        throw new ConflictException("Une tâche terminée ne peut pas être bloquée");
      if (tache.statut === StatutTache.BLOQUEE)
        throw new ConflictException("La tâche est déjà bloquée");
    } else if (tache.statut !== StatutTache.BLOQUEE) {
      throw new ConflictException("La tâche n'est pas bloquée");
    }
    await this.chantiers.verifierChantierModifiable(tache.chantierId);
    tache.statut = dto.bloquee
      ? StatutTache.BLOQUEE
      : statutPourAvancement(tache.avancement);
    const sauvee = await this.taches.save(tache);
    await this.journal.enregistrer(id, sauvee.statut, dto.bloquee ? dto.motif : undefined);
    return versReponse(sauvee);
  }

  async affecter(id: number, dto: AffectationDto): Promise<TacheReponse> {
    const tache = await this.charger(id);
    await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
    // La tâche ne doit pas entrer en conflit avec elle-même : on l'exclut de la recherche.
    await this.verifierPlanning(
      dto.ouvrierIds,
      tache.dateDebut,
      tache.dateFin,
      id,
    );
    tache.ouvrierIds = dto.ouvrierIds;
    return versReponse(await this.taches.save(tache));
  }

    /** Validations communes à la création et à la modification (400). */
  private verifierCorps(dto: CreerTacheDto) {
    if (new Date(dto.dateFin) < new Date(dto.dateDebut)) {
      throw new BadRequestException("dateFin doit être postérieure ou égale à dateDebut");
    }
    const besoins = dto.besoinsMateriaux ?? [];
    const doublon = besoins.find((b, i) => besoins.findIndex((x) => x.materiauId === b.materiauId) !== i);
    if (doublon) {
      throw new BadRequestException(`Le matériau ${doublon.materiauId} apparaît plusieurs fois dans besoinsMateriaux`);
    }
    return { besoins, dateDebut: dto.dateDebut.slice(0, 10), dateFin: dto.dateFin.slice(0, 10) };
  }

  /** PUT (#99) : mêmes vérifications que la création, la tâche modifiée est exclue du conflit de planning. */
  async modifier(id: number, dto: CreerTacheDto): Promise<TacheReponse> {
    const tache = await this.charger(id);
    const { besoins, dateDebut, dateFin } = this.verifierCorps(dto);
    // Les tâches d'un chantier clôturé ne changent plus ; un nouveau chantier doit accepter une tâche (RG-03).
    await this.chantiers.verifierChantierModifiable(tache.chantierId);
    if (dto.chantierId !== tache.chantierId) await this.chantiers.verifierChantierActif(dto.chantierId);
    if (dto.ouvrierIds?.length) {
      await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
      await this.verifierPlanning(dto.ouvrierIds, dateDebut, dateFin, id);
    }
    for (const b of besoins) await this.materiaux.verifierStock(b.materiauId, b.quantite);

    // Une seule transaction : les besoins en matériaux sont remplacés en entier ou pas du tout.
    await this.taches.manager.transaction(async (m) => {
      await m.delete(BesoinMateriau, { tacheId: id });
      await m.update(Tache, id, {
        chantierId: dto.chantierId,
        titre: dto.titre,
        description: dto.description ?? null,
        dateDebut,
        dateFin,
        ouvrierIds: dto.ouvrierIds ?? [],
      });
      if (besoins.length) {
        await m.insert(
          BesoinMateriau,
          besoins.map((b) => ({ tacheId: id, materiauId: b.materiauId, quantite: b.quantite })),
        );
      }
    });
    return this.trouver(id);
  }
  
  /**
   * #10 : un ouvrier ne peut pas être sur deux tâches dont les périodes se chevauchent.
   * Deux périodes se chevauchent si debut1 <= fin2 ET debut2 <= fin1 (bornes incluses :
   * partager un jour est un conflit, le lendemain non). Les tâches TERMINEE sont ignorées.
   * `exclureTacheId` écarte la tâche en cours de modification. Lève 409 au premier conflit.
   */
  private async verifierPlanning(
    ouvrierIds: number[],
    debut: string,
    fin: string,
    exclureTacheId?: number,
  ): Promise<void> {
    if (!ouvrierIds.length) return;
    const q = this.taches
      .createQueryBuilder("t")
      .where("t.ouvrier_ids && CAST(:ouvrierIds AS integer[])", { ouvrierIds })
      .andWhere("t.statut <> :termine", { termine: StatutTache.TERMINEE })
      .andWhere("t.dateDebut <= :fin", { fin })
      .andWhere("t.dateFin >= :debut", { debut })
      .orderBy("t.dateDebut", "ASC")
      .addOrderBy("t.id", "ASC");
    if (exclureTacheId !== undefined)
      q.andWhere("t.id <> :exclureTacheId", { exclureTacheId });

    const conflit = await q.getOne();
    if (!conflit) return;
    // Premier ouvrier demandé qui est déjà sur la tâche en conflit.
    const ouvrierId = ouvrierIds.find((o) =>
      (conflit.ouvrierIds ?? []).includes(o),
    );
    throw new ConflictException(
      `L'ouvrier ${ouvrierId} est déjà affecté à « ${conflit.titre} » (${conflit.dateDebut} → ${conflit.dateFin}) sur cette période`,
    );
  }

  /** Les besoins en matériaux sont supprimés avec la tâche (ON DELETE CASCADE). */
  async supprimer(id: number): Promise<void> {
    const res = await this.taches.delete({ id });
    if (!res.affected) throw new NotFoundException(`Tâche ${id} introuvable`);
  }

  private async charger(id: number): Promise<Tache> {
    const tache = await this.taches.findOne({ where: { id } });
    if (!tache) throw new NotFoundException(`Tâche ${id} introuvable`);
    return tache;
  }
}
