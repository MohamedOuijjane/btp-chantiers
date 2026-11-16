import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique, IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsPositive, IsString, Max, Min, ValidateNested,
} from 'class-validator';

export class BesoinMateriauDto {
  @ApiProperty({ example: 1 }) @IsInt() @IsPositive() materiauId: number;
  @ApiProperty({ example: 40 }) @IsNumber() @IsPositive() quantite: number;
}

export class CreerTacheDto {
  @ApiProperty({ example: 1 }) @IsInt() @IsPositive() chantierId: number;
  @ApiProperty({ example: 'Coulage des fondations' }) @IsString() @IsNotEmpty() titre: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: '2026-11-02' }) @IsDateString() dateDebut: string;
  @ApiProperty({ example: '2026-11-10' }) @IsDateString() dateFin: string;
  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional() @IsArray() @ArrayUnique() @IsInt({ each: true }) ouvrierIds?: number[];
  @ApiPropertyOptional({ type: [BesoinMateriauDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BesoinMateriauDto)
  besoinsMateriaux?: BesoinMateriauDto[];
}

export class AvancementDto {
  @ApiProperty({ example: 60, minimum: 0, maximum: 100 }) @IsInt() @Min(0) @Max(100) avancement: number;
}

export class AffectationDto {
  @ApiProperty({ type: [Number], example: [3] }) @IsArray() @ArrayUnique() @IsInt({ each: true }) ouvrierIds: number[];
}
