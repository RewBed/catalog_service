import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AdminCollectionDto } from './admin-collection.dto';

export class AdminCollectionPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [AdminCollectionDto],
    description: 'Collections items for current page',
    example: [
      {
        id: 1,
        title: 'Main Banner Collection',
        description: 'Products displayed in homepage banner',
        productIds: [101, 205, 330],
        products: [
          {
            id: 101,
            name: 'Oak Dining Table 120',
            slug: 'oak-dining-table-120',
            sku: 'TBL-OAK-120',
          },
        ],
        createdAt: '2026-03-12T16:10:00.000Z',
        updatedAt: '2026-03-12T16:15:00.000Z',
        deletedAt: null,
      },
    ],
  })
  items: AdminCollectionDto[];
}
