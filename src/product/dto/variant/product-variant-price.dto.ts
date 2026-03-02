import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class ProductVariantPriceDto {
    @ApiProperty({ description: 'Product id' })
    productId: number;

    @ApiProperty({ description: 'Base product price' })
    basePrice: number;

    @ApiProperty({ description: 'Total delta of selected options' })
    optionsPrice: number;

    @ApiProperty({ description: 'Final price with selected options' })
    finalPrice: number;

    @ApiProperty({ type: [ProductVariantOptionDto] })
    selectedOptions: ProductVariantOptionDto[];
}
