import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantOptionDto {
  @ApiProperty({ description: 'Variant option id', example: 201 })
  id: number;

  @ApiProperty({ description: 'Variant option title', example: '120 cm' })
  name: string;

  @ApiProperty({
    description: 'Price delta added to base product price',
    example: 300,
  })
  priceDelta: number;

  @ApiProperty({ description: 'Sort order', example: 2 })
  sortOrder: number;
}
