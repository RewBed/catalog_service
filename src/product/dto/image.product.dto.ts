import { ApiProperty } from '@nestjs/swagger';

export class ImageProductDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn.example.com/products/oak-dining-table-120/main.jpg',
  })
  url: string;

  @ApiProperty({ description: 'Image type', example: 'main' })
  type: string;
}
