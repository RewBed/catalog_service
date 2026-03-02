import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductVariantOptionDto {
    @ApiProperty({ description: 'Variant option title, for example 100 cm or oak' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiProperty({ description: 'Price delta for this option', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    priceDelta?: number;

    @ApiProperty({ description: 'Sort order', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @ApiProperty({ description: 'Active status', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
