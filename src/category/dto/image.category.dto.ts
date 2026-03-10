import { ApiProperty } from '@nestjs/swagger';

export class ImageCategoryDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
  })
  url: string;

  @ApiProperty({ description: 'Image type', example: 'main' })
  type: string;
}
