import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminFilterBranchProductDto {
  @ApiPropertyOptional({ description: 'Branch product id', example: 7001 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ description: 'Product id', example: 101 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    description: 'Product name filter (partial match, case-insensitive)',
    example: 'oak',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Product slug filter (partial match, case-insensitive)',
    example: 'oak-dining',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Product description filter (partial match, case-insensitive)',
    example: 'dining',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Branch id', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Price in branch', example: 25990 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Minimum price in branch',
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price in branch',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Stock in branch', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Minimum stock in branch', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ description: 'Maximum stock in branch', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === true || value === 'true' || value === 1 || value === '1',
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Created at from',
    type: String,
    format: 'date-time',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAtFrom?: Date;

  @ApiPropertyOptional({
    description: 'Created at to',
    type: String,
    format: 'date-time',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAtTo?: Date;

  @ApiPropertyOptional({
    description: 'Updated at from',
    type: String,
    format: 'date-time',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAtFrom?: Date;

  @ApiPropertyOptional({
    description: 'Updated at to',
    type: String,
    format: 'date-time',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAtTo?: Date;

  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 25,
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 25;
}
