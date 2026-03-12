import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Collection title',
    example: 'Main Banner Collection',
  })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Products displayed in homepage banner',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Product ids in required display order',
    example: [101, 205, 330],
    minItems: 1,
    uniqueItems: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds?: number[];
}
