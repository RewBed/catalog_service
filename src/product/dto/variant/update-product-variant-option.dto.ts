import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductVariantOptionDto {
  @ApiPropertyOptional({
    description: 'Variant option title, for example 100 cm or oak',
    example: '140 cm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Price delta for this option',
    example: 600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceDelta?: number;

  @ApiPropertyOptional({ description: 'Sort order', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
