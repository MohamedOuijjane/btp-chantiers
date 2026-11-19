import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Put,
} from "@nestjs/common";

import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IdTachePipe } from "./id-tache.pipe";
import {
  AffectationDto,
  AvancementDto,
  ChangerStatutDto,
  CreerTacheDto,
  BlocageDto,
} from "./tache.dto";
import { TachesService } from "./taches.service";

/** Documente le paramètre :id (entier) et les refus 400 / 404 communs aux routes d'une tâche. */
const ParamIdTache = () =>
  applyDecorators(
    ApiParam({
      name: "id",
      type: Number,
      description: "Identifiant entier positif de la tâche",
    }),
    ApiResponse({
      status: 400,
      description: "Identifiant invalide (entier positif attendu)",
    }),
    ApiResponse({ status: 404, description: "Tâche introuvable" }),
  );

@ApiTags("Tâches")
@Controller("api/taches")
export class TachesController {
  constructor(private readonly service: TachesService) {}

  @Get()
  @ApiOperation({
    summary: "Lister les tâches (filtres : chantierId, ouvrierId)",
  })
  @ApiQuery({ name: "chantierId", required: false, type: Number })
  @ApiQuery({ name: "ouvrierId", required: false, type: Number })
  lister(
    @Query("chantierId") chantierId?: string,
    @Query("ouvrierId") ouvrierId?: string,
  ) {
    return this.service.lister({
      chantierId: chantierId ? Number(chantierId) : undefined,
      ouvrierId: ouvrierId ? Number(ouvrierId) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Consulter une tâche" })
  @ParamIdTache()
  trouver(@Param("id", IdTachePipe) id: string) {
    return this.service.trouver(Number(id));
  }

  @Post()
  @ApiOperation({
    summary: "Créer une tâche (vérifie chantier, ouvriers et stock)",
  })
  creer(@Body() dto: CreerTacheDto) {
    return this.service.creer(dto);
  }

  @Patch(":id/avancement")
  @ApiOperation({ summary: "Mettre à jour le pourcentage d'avancement" })
  @ParamIdTache()
  avancement(@Param("id", IdTachePipe) id: string, @Body() dto: AvancementDto) {
    return this.service.mettreAJourAvancement(Number(id), dto.avancement);
  }

  @Patch(":id/blocage")
  @ApiOperation({ summary: "Bloquer ou débloquer une tâche" })
  @ParamIdTache()
  @ApiResponse({ status: 200, description: "Tâche mise à jour" })
  @ApiResponse({
    status: 409,
    description:
      "Tâche terminée, déjà bloquée, non bloquée ou chantier clôturé",
  })
  changerBlocage(
    @Param("id", IdTachePipe) id: string,
    @Body() dto: BlocageDto,
  ) {
    return this.service.changerBlocage(Number(id), dto);
  }

  @Patch(":id/statut")
  @ApiOperation({
    summary: "Changer le statut (A_FAIRE → EN_COURS → TERMINEE)",
  })
  @ParamIdTache()
  @ApiResponse({
    status: 409,
    description: "Transition impossible, tâche bloquée ou chantier clôturé",
  })
  statut(@Param("id", IdTachePipe) id: string, @Body() dto: ChangerStatutDto) {
    return this.service.changerStatut(Number(id), dto.statut);
  }

  @Patch(":id/ouvriers")
  @ApiOperation({ summary: "Affecter des ouvriers à la tâche" })
  @ParamIdTache()
  affecter(@Param("id", IdTachePipe) id: string, @Body() dto: AffectationDto) {
    return this.service.affecter(Number(id), dto);
  }

  @Put(":id")
  @ApiOperation({
    summary: "Modifier une tâche (mêmes vérifications que la création)",
  })
  @ParamIdTache()
  @ApiResponse({
    status: 409,
    description: "Chantier clôturé ou ouvrier déjà occupé sur la période",
  })
  @ApiResponse({
    status: 422,
    description: "Ouvrier indisponible ou stock insuffisant",
  })
  @ApiResponse({
    status: 503,
    description: "Chantiers, Ouvriers ou Matériaux injoignable",
  })
  modifier(@Param("id", IdTachePipe) id: string, @Body() dto: CreerTacheDto) {
    return this.service.modifier(Number(id), dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une tâche" })
  @ParamIdTache()
  supprimer(@Param("id", IdTachePipe) id: string) {
    return this.service.supprimer(Number(id));
  }
  @Get(":id/historique")
  @ApiOperation({
    summary:
      "Historique des statuts d'une tâche (du plus récent au plus ancien)",
  })
  @ParamIdTache()
  historique(@Param("id", IdTachePipe) id: string) {
    return this.service.historique(Number(id));
  }
}
