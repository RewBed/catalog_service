import { ApiPropertyOptional } from '@nestjs/swagger';
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

class UpdateProductVariantOptionInlineDto {
    @ApiPropertyOptional({ description: 'Variant option id. If omitted, option will be created' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

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

class UpdateProductVariantGroupInlineDto {
    @ApiPropertyOptional({ description: 'Variant group id. If omitted, group will be created' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ description: 'Variant group title, for example Size or Material' })
    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

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

    @ApiPropertyOptional({ type: [UpdateProductVariantOptionInlineDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariantOptionInlineDto)
    options?: UpdateProductVariantOptionInlineDto[];
}

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

    @ApiPropertyOptional({
        description: 'Variant groups update payload. With id updates existing group, without id creates new one',
        type: [UpdateProductVariantGroupInlineDto],
        example: [
            {
                id: 10,
                name: 'Size',
                options: [
                    { id: 100, priceDelta: 250 },
                    { name: '140 cm', priceDelta: 600, sortOrder: 3 },
                ],
            },
            {
                name: 'Color',
                isRequired: false,
                options: [{ name: 'White', priceDelta: 0 }],
            },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductVariantGroupInlineDto)
    variantGroups?: UpdateProductVariantGroupInlineDto[];
}
