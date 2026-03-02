import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateProductVariantOptionDto {
    @ApiPropertyOptional({ description: 'Variant option title, for example 100 cm or oak' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({ description: 'Price delta for this option' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    priceDelta?: number;

    @ApiPropertyOptional({ description: 'Sort order' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiPropertyOptional({ description: 'Active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
