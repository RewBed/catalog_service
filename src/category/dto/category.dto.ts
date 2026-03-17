import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    example: 'Solid wood tables for dining rooms',
    description: 'Short category description for cards and previews',
  })
  shortDescription?: string;

  @ApiPropertyOptional({
    example: 'Tables for kitchen and dining rooms',
    description: 'Full category description',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 'tabler:table',
    description: 'Category icon value for frontend rendering',
  })
  icon?: string;

  @ApiProperty({ example: 3 })
  parentId?: number = 0;

  @ApiProperty({
    type: [ImageCategoryDto],
    example: [
      {
        url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
        type: 'main',
        title: 'Category hero',
        description: 'Top banner image for category page',
      },
      {
        url: 'https://cdn.example.com/categories/wooden-tables/banner.jpg',
        type: 'banner',
        title: 'Category promo banner',
        description: 'Wide promotional banner for the category',
      },
    ],
  })
  images: ImageCategoryDto[] = [];
}
