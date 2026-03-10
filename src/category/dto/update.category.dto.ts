import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Wooden Tables Premium',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Full category name',
    example: 'Premium Dining Tables and Wooden Sets',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Unique category slug',
    example: 'wooden-tables-premium',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Updated collection of dining tables',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category id (0 means no parent)',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Sorting priority', example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
