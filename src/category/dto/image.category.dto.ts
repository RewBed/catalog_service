import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImageCategoryDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
  })
  url: string;

  @ApiProperty({ description: 'Image type', example: 'main' })
  type: string;

  @ApiPropertyOptional({
    description: 'Image title',
    nullable: true,
    example: 'Category hero',
  })
  title?: string | null;

  @ApiPropertyOptional({
    description: 'Image description',
    nullable: true,
    example: 'Banner for category listing page',
  })
  description?: string | null;
}
