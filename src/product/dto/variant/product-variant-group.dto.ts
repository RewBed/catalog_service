import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class ProductVariantGroupDto {
  @ApiProperty({ description: 'Variant group id', example: 12 })
  id: number;

  @ApiProperty({
    description: 'Variant group title, for example Size or Material',
    example: 'Size',
  })
  name: string;

  @ApiProperty({
    description: 'Whether one option from this group must be selected',
    example: true,
  })
  isRequired: boolean;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;

  @ApiProperty({
    type: [ProductVariantOptionDto],
    example: [
      {
        id: 200,
        name: '80 cm',
        priceDelta: 0,
        sortOrder: 1,
      },
      {
        id: 201,
        name: '120 cm',
        priceDelta: 300,
        sortOrder: 2,
      },
    ],
  })
  options: ProductVariantOptionDto[];
}
