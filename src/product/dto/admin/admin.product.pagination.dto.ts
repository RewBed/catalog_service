import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ProductDto } from '../product.dto';

export class AdminProductPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [ProductDto],
    example: [
      {
        id: 101,
        name: 'Oak Dining Table 120',
        fullName: 'Solid Oak Dining Table 120 x 80 cm',
        slug: 'oak-dining-table-120',
        description: 'Natural solid oak dining table with matte finish',
        price: 24990,
        categoryId: 3,
        sortOrder: 10,
        images: [
          {
            url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
            type: 'main',
          },
        ],
      },
    ],
  })
  items: ProductDto[];
}
