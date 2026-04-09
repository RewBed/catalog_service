jest.mock('src/core/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code?: string;
      meta?: Record<string, unknown>;
    },
  },
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { CategoryService } from './category.service';

type CategoryImageRecord = {
  url: string;
  type: string;
  title?: string | null;
  description?: string | null;
  sortOrder?: number;
};

type CategoryRecord = {
  id: number;
  name: string;
  fullName?: string | null;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  icon?: string | null;
  parentId?: number | null;
  sortOrder?: number | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  images?: CategoryImageRecord[];
};

const createPrismaError = (code: string) => {
  const KnownRequestError = Prisma
    .PrismaClientKnownRequestError as unknown as new () => {
    code?: string;
    meta?: Record<string, unknown>;
  };
  const error = new KnownRequestError();
  error.code = code;
  return error;
};

const createCategory = (overrides: Partial<CategoryRecord> = {}): CategoryRecord => ({
  id: 12,
  name: 'Wooden Tables',
  fullName: 'Dining Tables and Wooden Sets',
  slug: 'wooden-tables',
  shortDescription: 'Solid wood tables for dining rooms',
  description: 'Tables for kitchen and dining rooms',
  icon: 'tabler:table',
  parentId: 3,
  sortOrder: 120,
  deletedAt: null,
  createdAt: new Date('2026-03-10T08:15:20.000Z'),
  updatedAt: new Date('2026-03-10T09:40:03.000Z'),
  images: [
    {
      url: 'https://cdn.example.com/categories/wooden-tables/main.jpg',
      type: 'main',
      title: 'Category hero',
      description: 'Top banner image for category page',
      sortOrder: 0,
    },
  ],
  ...overrides,
});

const createPrismaMock = () => ({
  category: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('CategoryService', () => {
  it('returns public categories with filters and pagination', async () => {
    const prisma = createPrismaMock();
    prisma.category.count.mockResolvedValue(1);
    prisma.category.findMany.mockResolvedValue([createCategory()]);
    const service = new CategoryService(prisma as any);

    const result = await service.getAll({
      name: 'table',
      description: 'dining',
      parentId: 3,
      page: 2,
      limit: 10,
    });

    expect(prisma.category.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        name: { contains: 'table', mode: 'insensitive' },
        description: { contains: 'dining', mode: 'insensitive' },
        parentId: 3,
      },
    });
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        name: { contains: 'table', mode: 'insensitive' },
        description: { contains: 'dining', mode: 'insensitive' },
        parentId: 3,
      },
      skip: 10,
      take: 10,
      orderBy: { sortOrder: 'asc' },
      include: {
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });
    expect(result.meta).toEqual({ limit: 10, page: 2, total: 1 });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 12,
        slug: 'wooden-tables',
      }),
    );
  });

  it('normalizes parentId=0 to null on create', async () => {
    const prisma = createPrismaMock();
    prisma.category.create.mockResolvedValue(
      createCategory({
        id: 15,
        parentId: null,
      }),
    );
    const service = new CategoryService(prisma as any);

    const result = await service.create({
      name: 'New Category',
      slug: 'new-category',
      parentId: 0,
    });

    expect(prisma.category.findUnique).not.toHaveBeenCalled();
    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Category',
          slug: 'new-category',
          parentId: null,
        }),
      }),
    );
    expect(result.parentId).toBe(0);
  });

  it('throws bad request when category is set as its own parent', async () => {
    const prisma = createPrismaMock();
    prisma.category.findUnique.mockResolvedValue({
      id: 7,
      deletedAt: null,
    });
    const service = new CategoryService(prisma as any);

    await expect(
      service.update(7, {
        parentId: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft deletes category and detaches active children', async () => {
    const prisma = createPrismaMock();
    prisma.category.findUnique.mockResolvedValue({
      id: 9,
      deletedAt: null,
    });
    prisma.category.updateMany.mockResolvedValue({ count: 2 });
    prisma.category.update.mockResolvedValue(createCategory({ id: 9 }));
    prisma.$transaction.mockResolvedValue(undefined);
    const service = new CategoryService(prisma as any);

    await service.remove(9);

    expect(prisma.category.updateMany).toHaveBeenCalledWith({
      where: {
        parentId: 9,
        deletedAt: null,
      },
      data: {
        parentId: null,
      },
    });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws not found when category is missing for restore', async () => {
    const prisma = createPrismaMock();
    prisma.category.findUnique.mockResolvedValue(null);
    const service = new CategoryService(prisma as any);

    await expect(service.restore(1000)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps unique slug conflict to conflict exception', async () => {
    const prisma = createPrismaMock();
    prisma.category.create.mockRejectedValue(createPrismaError('P2002'));
    const service = new CategoryService(prisma as any);

    await expect(
      service.create({
        name: 'Duplicated',
        slug: 'wooden-tables',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('includes image title and description in category dto mapping', () => {
    const service = new CategoryService({} as any);

    const dto = (service as any).toDo(createCategory());

    expect(dto).toMatchObject({
      id: 12,
      slug: 'wooden-tables',
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
