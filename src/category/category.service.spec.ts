jest.mock('src/core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
  },
}));

import { CategoryService } from './category.service';

describe('CategoryService DTO mapping', () => {
  const service = new CategoryService({} as any);

  it('includes image title and description in category dto', () => {
    const dto = (service as any).toDo({
      id: 12,
      name: 'Wooden Tables',
      fullName: 'Dining Tables and Wooden Sets',
      slug: 'wooden-tables',
      shortDescription: 'Solid wood tables for dining rooms',
      description: 'Tables for kitchen and dining rooms',
      icon: 'tabler:table',
      parentId: 3,
      images: [
        {
          url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
          type: 'main',
          title: 'Category hero',
          description: 'Top banner image for category page',
        },
      ],
    });

    expect(dto).toMatchObject({
      id: 12,
      name: 'Wooden Tables',
      fullName: 'Dining Tables and Wooden Sets',
      slug: 'wooden-tables',
      shortDescription: 'Solid wood tables for dining rooms',
      description: 'Tables for kitchen and dining rooms',
      icon: 'tabler:table',
      parentId: 3,
      images: [
        {
          url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
          type: 'main',
          title: 'Category hero',
          description: 'Top banner image for category page',
        },
      ],
    });
  });
});
