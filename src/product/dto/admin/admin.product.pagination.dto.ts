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
        sku: 'TBL-OAK-120',
        article: 'TBL-OAK-120',
        slug: 'oak-dining-table-120',
        shortDescription: 'Compact oak dining table for 4 people',
        description: 'Natural solid oak dining table with matte finish',
        technicalDescription: 'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg.',
        price: 24990,
        categoryId: 3,
        categoryName: 'Dining Tables',
        sortOrder: 10,
        images: [
          {
            url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
            type: 'main',
            title: 'Main view',
            description: 'Front angle photo for product card',
          },
        ],
      },
    ],
  })
  items: ProductDto[];
}
