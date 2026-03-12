import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectionProductDto {
  @ApiProperty({ description: 'Product id', example: 101 })
  id: number;

  @ApiProperty({ description: 'Product name', example: 'Oak Dining Table 120' })
  name: string;

  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Product SKU (article)',
    example: 'TBL-OAK-120',
  })
  sku?: string;
}
