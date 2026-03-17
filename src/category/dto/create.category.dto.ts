import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Wooden Tables' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Full category name',
    example: 'Dining Tables and Wooden Sets',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  fullName?: string;

  @ApiProperty({
    description: 'Unique category slug',
    example: 'wooden-tables',
  })
  @IsString()
  @MaxLength(250)
  slug: string;

  @ApiPropertyOptional({
    description: 'Short category description for cards and previews',
    example: 'Solid wood tables for dining rooms',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Tables for kitchen and dining rooms',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category icon value. Can store icon id, emoji, SVG markup, or another frontend token',
    example: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/></svg>',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    description: 'Parent category id (0 means no parent)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Sorting priority', example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
