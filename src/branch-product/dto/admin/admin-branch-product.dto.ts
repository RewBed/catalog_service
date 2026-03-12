import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminProductVariantGroupDto } from 'src/product/dto/variant/admin-product-variant-group.dto';

export class AdminBranchProductDto {
  @ApiProperty({ description: 'Branch product id', example: 7001 })
  id: number;

  @ApiProperty({ description: 'Product id', example: 101 })
  productId: number;

  @ApiProperty({ description: 'Product category name', example: 'Dining Tables' })
  categoryName: string;

  @ApiPropertyOptional({ description: 'Product SKU (article)', example: 'TBL-OAK-120' })
  sku?: string;

  @ApiProperty({ description: 'Branch id', example: 5 })
  branchId: number;

  @ApiProperty({ description: 'Price in branch', example: 25990 })
  price: number;

  @ApiProperty({ description: 'Stock in branch', example: 20 })
  stock: number;

  @ApiProperty({ description: 'Active status', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Created at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T08:45:17.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T10:01:44.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: [AdminProductVariantGroupDto],
    description: 'Product variant groups. Returned in detailed admin endpoint by id',
  })
  variantGroups?: AdminProductVariantGroupDto[];
}
