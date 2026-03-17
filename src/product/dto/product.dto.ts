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

  @ApiPropertyOptional({
    description: 'Product article (alias of sku)',
    example: 'TBL-OAK-120',
  })
  article?: string;

  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Short product description for cards and lists',
    example: 'Compact oak dining table for 4 people',
  })
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Natural solid oak dining table with matte finish',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Technical product description with specifications and service details',
    example: 'Material: oak. Dimensions: 120x80x75 cm. Weight: 32 kg. Finish: matte oil.',
  })
  technicalDescription?: string;

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
        title: 'Main view',
        description: 'Front angle photo for product card',
      },
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/icon.jpg',
        type: 'icon',
        title: 'Icon view',
        description: 'Compact square image for listing cards',
      },
    ],
  })
  images: ImageProductDto[] = [];
}
