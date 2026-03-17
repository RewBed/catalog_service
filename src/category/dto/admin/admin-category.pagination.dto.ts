import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';
import { AdminCategoryDto } from './admin-category.dto';

export class AdminCategoryPaginationDto extends PaginationDto {
  @ApiProperty({
    type: [AdminCategoryDto],
    example: [
      {
        id: 12,
        name: 'Wooden Tables',
        fullName: 'Dining Tables and Wooden Sets',
        slug: 'wooden-tables',
        shortDescription: 'Solid wood tables for dining rooms',
        description: 'Tables for kitchen and dining rooms',
        icon: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/></svg>',
        parentId: 3,
        sortOrder: 120,
        createdAt: '2026-03-10T08:15:20.000Z',
        updatedAt: '2026-03-10T09:40:03.000Z',
        deletedAt: null,
        images: [
          {
            url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
            type: 'main',
            title: 'Category hero',
            description: 'Top banner image for category page',
          },
        ],
      },
    ],
  })
  items: AdminCategoryDto[];
}
