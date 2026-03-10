import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantOptionDto } from './product-variant-option.dto';

export class AdminProductVariantOptionDto extends ProductVariantOptionDto {
  @ApiProperty({ description: 'Variant group id', example: 12 })
  groupId: number;

  @ApiProperty({ description: 'Active status', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Created at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T07:40:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    type: String,
    format: 'date-time',
    example: '2026-03-10T09:11:45.000Z',
  })
  updatedAt: Date;
}
