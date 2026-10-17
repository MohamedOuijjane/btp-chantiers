import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AffectationDto, AvancementDto, CreerTacheDto } from './tache.dto';
import { TachesService } from './taches.service';

@ApiTags('Tâches')
@Controller('api/taches')
export class TachesController {
  constructor(private readonly service: TachesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les tâches (filtres : chantierId, ouvrierId)' })
  @ApiQuery({ name: 'chantierId', required: false, type: Number })
  @ApiQuery({ name: 'ouvrierId', required: false, type: Number })
  lister(@Query('chantierId') chantierId?: string, @Query('ouvrierId') ouvrierId?: string) {
    return this.service.lister({
      chantierId: chantierId ? Number(chantierId) : undefined,
      ouvrierId: ouvrierId ? Number(ouvrierId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter une tâche' })
  trouver(@Param('id') id: string) {
    return this.service.trouver(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une tâche (vérifie chantier, ouvriers et stock)' })
  creer(@Body() dto: CreerTacheDto) {
    return this.service.creer(dto);
  }

  @Patch(':id/avancement')
  @ApiOperation({ summary: "Mettre à jour le pourcentage d'avancement" })
  avancement(@Param('id') id: string, @Body() dto: AvancementDto) {
    return this.service.mettreAJourAvancement(id, dto.avancement);
  }

  @Patch(':id/ouvriers')
  @ApiOperation({ summary: 'Affecter des ouvriers à la tâche' })
  affecter(@Param('id') id: string, @Body() dto: AffectationDto) {
    return this.service.affecter(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une tâche' })
  supprimer(@Param('id') id: string) {
    return this.service.supprimer(id);
  }
}
