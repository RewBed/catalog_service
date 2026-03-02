import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class AdminProductVariantOptionDto extends ProductVariantOptionDto {
    @ApiProperty({ description: 'Variant group id' })
    groupId: number;

    @ApiProperty({ description: 'Active status' })
    isActive: boolean;

    @ApiProperty({ description: 'Created at', type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at', type: String, format: 'date-time' })
    updatedAt: Date;
}
