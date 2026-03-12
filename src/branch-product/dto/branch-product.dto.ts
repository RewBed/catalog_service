import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImageProductDto } from 'src/product/dto/image.product.dto';
import { ProductVariantGroupDto } from 'src/product/dto/variant/product-variant-group.dto';

export class BranchProductDto {
  @ApiProperty({ description: 'Branch product id', example: 7001 })
  id: number;

  @ApiProperty({ description: 'Product id', example: 301 })
  productId: number;

  @ApiProperty({ description: 'Product category id', example: 12 })
  categoryId: number;

  @ApiProperty({ description: 'Product category name', example: 'Dining Tables' })
  categoryName: string;

  @ApiProperty({ description: 'Branch id', example: 5 })
  branchId: number;

  @ApiProperty({ description: 'Price in branch', example: 25990 })
  price: number;

  @ApiProperty({ description: 'Stock in branch', example: 20 })
  stock: number;

  @ApiProperty({ description: 'Product name', example: 'Oak Dining Table 120' })
  name: string;

  @ApiPropertyOptional({ description: 'Product SKU (article)', example: 'TBL-OAK-120' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Product article (alias of sku)', example: 'TBL-OAK-120' })
  article?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Solid oak dining table, 120 cm width',
  })
  description?: string;

  @ApiProperty({ description: 'Product slug', example: 'oak-dining-table-120' })
  slug: string;

  @ApiProperty({
    type: [ImageProductDto],
    example: [
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
        type: 'main',
      },
      {
        url: 'https://cdn.example.com/products/oak-dining-table-120/gallery-1.jpg',
        type: 'gallery',
      },
    ],
  })
  images: ImageProductDto[] = [];

  @ApiPropertyOptional({
    type: [ProductVariantGroupDto],
    description:
      'Product variant groups. Returned in detailed endpoints by id/by-slug',
  })
  variantGroups?: ProductVariantGroupDto[];
}
