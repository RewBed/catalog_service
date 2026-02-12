import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ description: 'Product name' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ description: 'Full product name' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    fullName?: string;

    @ApiProperty({ description: 'Product slug' })
    @IsString()
    @MaxLength(250)
    slug: string;

    @ApiPropertyOptional({ description: 'Product description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Product price' })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ description: 'Category id' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId: number;

    @ApiPropertyOptional({ description: 'Sorting priority' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    sortOrder?: number;
}
