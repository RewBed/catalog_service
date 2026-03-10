import { ApiProperty } from '@nestjs/swagger';
import { ImageCategoryDto } from './image.category.dto';

export class CategoryDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Wooden Tables' })
  name: string;

  @ApiProperty({ example: 'Dining Tables and Wooden Sets' })
  fullName?: string;

  @ApiProperty({ example: 'wooden-tables' })
  slug: string;

  @ApiProperty({ example: 'Tables for kitchen and dining rooms' })
  description?: string;

  @ApiProperty({ example: 3 })
  parentId?: number = 0;

  @ApiProperty({
    type: [ImageCategoryDto],
    example: [
      {
        url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
        type: 'main',
      },
      {
        url: 'https://cdn.example.com/categories/wooden-tables/banner.jpg',
        type: 'banner',
      },
    ],
  })
  images: ImageCategoryDto[] = [];
}
