import { ApiProperty } from '@nestjs/swagger';
import { AdminProductVariantOptionDto } from './admin-product-variant-option.dto';

export class AdminProductVariantGroupDto {
    @ApiProperty({ description: 'Variant group id' })
    id: number;

    @ApiProperty({ description: 'Product id' })
    productId: number;

    @ApiProperty({ description: 'Variant group title, for example Size or Material' })
    name: string;

    @ApiProperty({ description: 'Whether one option from this group must be selected' })
    isRequired: boolean;

    @ApiProperty({ description: 'Sort order' })
    sortOrder: number;

    @ApiProperty({ description: 'Active status' })
    isActive: boolean;

    @ApiProperty({ type: [AdminProductVariantOptionDto] })
    options: AdminProductVariantOptionDto[];

    @ApiProperty({ description: 'Created at', type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at', type: String, format: 'date-time' })
    updatedAt: Date;
}
