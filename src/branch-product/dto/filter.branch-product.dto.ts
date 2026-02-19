import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FilterBranchProductDto {
    @ApiPropertyOptional({ description: 'Branch id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    branchId?: number;

    @ApiPropertyOptional({ description: 'Price in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ description: 'Minimum price in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional({ description: 'Maximum price in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxPrice?: number;

    @ApiPropertyOptional({ description: 'Product name filter' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Product description filter' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Product category id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 25 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number = 25;
}
