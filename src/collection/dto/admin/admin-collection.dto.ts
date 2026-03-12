import { ApiProperty } from '@nestjs/swagger';
import { CollectionDto } from '../collection.dto';
import { CollectionProductDto } from '../collection-product.dto';

export class AdminCollectionDto extends CollectionDto {
  @ApiProperty({
    type: [Number],
    description: 'Linked product ids in collection order',
    example: [101, 205, 330],
  })
  productIds: number[] = [];

  @ApiProperty({
    type: [CollectionProductDto],
    description: 'Linked product previews',
    example: [
      {
        id: 101,
        name: 'Oak Dining Table 120',
        slug: 'oak-dining-table-120',
        sku: 'TBL-OAK-120',
      },
      {
        id: 205,
        name: 'Ash Dining Table 140',
        slug: 'ash-dining-table-140',
        sku: 'TBL-ASH-140',
      },
    ],
  })
  products: CollectionProductDto[] = [];

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-12T16:10:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-03-12T16:15:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  deletedAt: Date | null;
}
