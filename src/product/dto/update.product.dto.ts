import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateProductDto {
    @ApiPropertyOptional({ description: 'Product name' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'Full product name' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    fullName?: string;

    @ApiPropertyOptional({ description: 'Product slug' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    slug?: string;

    @ApiPropertyOptional({ description: 'Product description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Product price' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ description: 'Category id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

    @ApiPropertyOptional({ description: 'Sorting priority' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    sortOrder?: number;
}
