import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class UpdateProductVariantOptionInlineDto {
  @ApiPropertyOptional({
    description: 'Variant option id. If omitted, option will be created',
    example: 201,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

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

class UpdateProductVariantGroupInlineDto {
  @ApiPropertyOptional({
    description: 'Variant group id. If omitted, group will be created',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({
    description: 'Variant group title, for example Size or Material',
    example: 'Size',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether one option from this group must be selected',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [UpdateProductVariantOptionInlineDto],
    example: [
      { id: 201, priceDelta: 250, sortOrder: 1 },
      { name: '160 cm', priceDelta: 900, sortOrder: 4, isActive: true },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantOptionInlineDto)
  options?: UpdateProductVariantOptionInlineDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Oak Dining Table 140',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Full product name',
    example: 'Solid Oak Dining Table 140 x 80 cm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'SKU (article)',
    example: 'TBL-OAK-140',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Product slug',
    example: 'oak-dining-table-140',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Updated model with larger top and reinforced legs',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Product price', example: 27990 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Category id', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Sorting priority', example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    description:
      'Variant groups update payload. With id updates existing group, without id creates new one',
    type: [UpdateProductVariantGroupInlineDto],
    example: [
      {
        id: 10,
        name: 'Size',
        options: [
          { id: 100, priceDelta: 250 },
          { name: '140 cm', priceDelta: 600, sortOrder: 3 },
        ],
      },
      {
        name: 'Color',
        isRequired: false,
        options: [{ name: 'White', priceDelta: 0 }],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantGroupInlineDto)
  variantGroups?: UpdateProductVariantGroupInlineDto[];
}
