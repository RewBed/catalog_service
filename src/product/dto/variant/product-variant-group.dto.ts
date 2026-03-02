import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class ProductVariantGroupDto {
    @ApiProperty({ description: 'Variant group id' })
    id: number;

    @ApiProperty({ description: 'Variant group title, for example Size or Material' })
    name: string;

    @ApiProperty({ description: 'Whether one option from this group must be selected' })
    isRequired: boolean;

    @ApiProperty({ description: 'Sort order' })
    sortOrder: number;

    @ApiProperty({ type: [ProductVariantOptionDto] })
    options: ProductVariantOptionDto[];
}
