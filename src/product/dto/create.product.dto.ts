import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

class CreateProductVariantOptionInlineDto {
  @ApiProperty({
    description: 'Variant option title, for example 100 cm or oak',
    example: '120 cm',
  })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Price delta for this option',
    example: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceDelta?: number;

  @ApiPropertyOptional({ description: 'Sort order', example: 2 })
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

class CreateProductVariantGroupInlineDto {
  @ApiProperty({
    description: 'Variant group title, for example Size or Material',
    example: 'Size',
  })
  @IsString()
  @MaxLength(150)
  name: string;

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
    type: [CreateProductVariantOptionInlineDto],
    example: [
      { name: '80 cm', priceDelta: 0, sortOrder: 1, isActive: true },
      { name: '120 cm', priceDelta: 300, sortOrder: 2, isActive: true },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantOptionInlineDto)
  options?: CreateProductVariantOptionInlineDto[];
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Oak Dining Table 120' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Full product name',
    example: 'Solid Oak Dining Table 120 x 80 cm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  fullName?: string;

  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  @IsString()
  @MaxLength(250)
  slug: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Natural solid oak dining table with matte finish',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Product price', example: 24990 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Category id', example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiPropertyOptional({ description: 'Sorting priority', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Product variant groups with optional nested options',
    type: [CreateProductVariantGroupInlineDto],
    example: [
      {
        name: 'Size',
        isRequired: true,
        sortOrder: 1,
        options: [
          { name: '80 cm', priceDelta: 0, sortOrder: 1 },
          { name: '120 cm', priceDelta: 300, sortOrder: 2 },
        ],
      },
      {
        name: 'Material',
        isRequired: false,
        sortOrder: 2,
        options: [{ name: 'Oak', priceDelta: 500, sortOrder: 1 }],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantGroupInlineDto)
  variantGroups?: CreateProductVariantGroupInlineDto[];
}
