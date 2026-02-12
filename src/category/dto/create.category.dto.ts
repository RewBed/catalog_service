import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ description: 'Full category name' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    fullName?: string;

    @ApiProperty({ description: 'Unique category slug' })
    @IsString()
    @MaxLength(250)
    slug: string;

    @ApiPropertyOptional({ description: 'Category description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Parent category id (0 means no parent)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    parentId?: number;

    @ApiPropertyOptional({ description: 'Sorting priority' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    sortOrder?: number;
}
