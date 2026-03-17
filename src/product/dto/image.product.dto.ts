import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImageProductDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
  })
  url: string;

  @ApiProperty({ description: 'Image type', example: 'main' })
  type: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Image title',
    nullable: true,
    example: 'Main view',
  })
  title?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Image description',
    nullable: true,
    example: 'Front angle photo for product card',
  })
  description?: string | null;
}
