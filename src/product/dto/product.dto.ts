import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageProductDto } from './image.product.dto';

export class ProductDto {
  @ApiProperty({ description: 'Product id', example: 101 })
  id: number;

  @ApiProperty({ description: 'Product name', example: 'Oak Dining Table 120' })
  name: string;

  @ApiPropertyOptional({
    description: 'Full product name',
    example: 'Solid Oak Dining Table 120 x 80 cm',
  })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'SKU (article)',
    example: 'TBL-OAK-120',
  })
  sku?: string;

  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Natural solid oak dining table with matte finish',
  })
  description?: string;

  @ApiProperty({ description: 'Product price', example: 24990 })
  price: number;

  @ApiProperty({ description: 'Category id', example: 3 })
  categoryId: number;

  @ApiProperty({ description: 'Category name', example: 'Dining Tables' })
  categoryName: string;

  @ApiProperty({ description: 'Sorting priority', example: 10 })
  sortOrder: number;

  @ApiProperty({
    type: [ImageProductDto],
    example: [
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
        type: 'main',
      },
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/icon.jpg',
        type: 'icon',
      },
    ],
  })
  images: ImageProductDto[] = [];
}
