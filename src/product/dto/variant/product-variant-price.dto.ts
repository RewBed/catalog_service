import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class ProductVariantPriceDto {
  @ApiProperty({ description: 'Product id', example: 101 })
  productId: number;

  @ApiProperty({ description: 'Base product price', example: 24990 })
  basePrice: number;

  @ApiProperty({ description: 'Total delta of selected options', example: 800 })
  optionsPrice: number;

  @ApiProperty({
    description: 'Final price with selected options',
    example: 25790,
  })
  finalPrice: number;

  @ApiProperty({
    type: [ProductVariantOptionDto],
    example: [
      {
        id: 201,
        name: '120 cm',
        priceDelta: 300,
        sortOrder: 2,
      },
      {
        id: 303,
        name: 'Oak',
        priceDelta: 500,
        sortOrder: 1,
      },
    ],
  })
  selectedOptions: ProductVariantOptionDto[];
}
