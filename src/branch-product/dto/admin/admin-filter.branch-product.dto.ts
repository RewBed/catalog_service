import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class AdminFilterBranchProductDto {
    @ApiPropertyOptional({ description: 'Branch product id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ description: 'Product id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    productId?: number;

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

    @ApiPropertyOptional({ description: 'Stock in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ description: 'Minimum stock in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    minStock?: number;

    @ApiPropertyOptional({ description: 'Maximum stock in branch' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxStock?: number;

    @ApiPropertyOptional({ description: 'Active status' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Created at from', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    createdAtFrom?: Date;

    @ApiPropertyOptional({ description: 'Created at to', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    createdAtTo?: Date;

    @ApiPropertyOptional({ description: 'Updated at from', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    updatedAtFrom?: Date;

    @ApiPropertyOptional({ description: 'Updated at to', type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    updatedAtTo?: Date;

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
