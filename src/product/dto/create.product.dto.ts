import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

class CreateProductVariantOptionInlineDto {
    @ApiProperty({ description: 'Variant option title, for example 100 cm or oak' })
    @IsString()
    @MaxLength(150)
    name: string;

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

class CreateProductVariantGroupInlineDto {
    @ApiProperty({ description: 'Variant group title, for example Size or Material' })
    @IsString()
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ description: 'Whether one option from this group must be selected' })
    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

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

    @ApiPropertyOptional({ type: [CreateProductVariantOptionInlineDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductVariantOptionInlineDto)
    options?: CreateProductVariantOptionInlineDto[];
}

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

    @ApiPropertyOptional({
        description: 'Product variant groups with optional nested options',
        type: [CreateProductVariantGroupInlineDto],
        example: [
            {
                name: 'Size',
                isRequired: true,
                sortOrder: 1,
                options: [
                    { name: '80 cm', priceDelta: 0, sortOrder: 1 },
                    { name: '120 cm', priceDelta: 300, sortOrder: 2 },
                ],
            },
            {
                name: 'Material',
                isRequired: false,
                sortOrder: 2,
                options: [{ name: 'Oak', priceDelta: 500, sortOrder: 1 }],
            },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductVariantGroupInlineDto)
    variantGroups?: CreateProductVariantGroupInlineDto[];
}
