import { ApiProperty } from '@nestjs/swagger';
import { BranchProductDto } from 'src/branch-product/dto/branch-product.dto';
import { CollectionDto } from './collection.dto';

export class PublicCollectionDto extends CollectionDto {
  @ApiProperty({
    type: [BranchProductDto],
    description:
      'Branch products that are part of this collection for the requested branch',
    example: [
      {
        id: 7001,
        productId: 101,
        categoryId: 12,
        categoryName: 'Dining Tables',
        branchId: 5,
        price: 25990,
        stock: 20,
        name: 'Oak Dining Table 120',
        sku: 'TBL-OAK-120',
        description: 'Solid oak dining table, 120 cm width',
        slug: 'oak-dining-table-120',
        images: [
          {
            url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
            type: 'main',
          },
        ],
      },
    ],
  })
  products: BranchProductDto[] = [];
}
