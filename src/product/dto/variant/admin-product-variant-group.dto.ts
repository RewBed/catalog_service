import { ApiProperty } from '@nestjs/swagger';
import { AdminProductVariantOptionDto } from './admin-product-variant-option.dto';

export class AdminProductVariantGroupDto {
  @ApiProperty({ description: 'Variant group id', example: 12 })
  id: number;

  @ApiProperty({ description: 'Product id', example: 101 })
  productId: number;

  @ApiProperty({
    description: 'Variant group title, for example Size or Material',
    example: 'Size',
  })
  name: string;

  @ApiProperty({
    description: 'Whether one option from this group must be selected',
    example: true,
  })
  isRequired: boolean;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: 'Active status', example: true })
  isActive: boolean;

  @ApiProperty({
    type: [AdminProductVariantOptionDto],
    example: [
      {
        id: 200,
        groupId: 12,
        name: '80 cm',
        priceDelta: 0,
        sortOrder: 1,
        isActive: true,
        createdAt: '2026-03-10T07:40:00.000Z',
        updatedAt: '2026-03-10T09:11:45.000Z',
      },
      {
        id: 201,
        groupId: 12,
        name: '120 cm',
        priceDelta: 300,
        sortOrder: 2,
        isActive: true,
        createdAt: '2026-03-10T07:45:00.000Z',
        updatedAt: '2026-03-10T09:15:00.000Z',
      },
    ],
  })
  options: AdminProductVariantOptionDto[];

  @ApiProperty({
    description: 'Created at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T07:35:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T09:20:00.000Z',
  })
  updatedAt: Date;
}
