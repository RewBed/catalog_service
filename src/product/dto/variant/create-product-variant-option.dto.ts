import { ApiProperty } from '@nestjs/swagger';
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

export class CreateProductVariantOptionDto {
  @ApiProperty({
    description: 'Variant option title, for example 100 cm or oak',
    example: '120 cm',
  })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Price delta for this option',
    required: false,
    example: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceDelta?: number;

  @ApiProperty({ description: 'Sort order', required: false, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty({ description: 'Active status', required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
