import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CategoryDto } from './category.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [CategoryDto],
    example: [
      {
        id: 12,
        name: 'Wooden Tables',
        fullName: 'Dining Tables and Wooden Sets',
        slug: 'wooden-tables',
        description: 'Tables for kitchen and dining rooms',
        parentId: 3,
        images: [
          {
            url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
            type: 'main',
          },
        ],
      },
    ],
  })
  items: CategoryDto[];
}
