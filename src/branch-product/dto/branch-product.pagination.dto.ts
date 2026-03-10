import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { BranchProductDto } from './branch-product.dto';

export class BranchProductPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [BranchProductDto],
    example: [
      {
        id: 7001,
        branchId: 5,
        price: 25990,
        stock: 20,
        name: 'Oak Dining Table 120',
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
  items: BranchProductDto[];
}
